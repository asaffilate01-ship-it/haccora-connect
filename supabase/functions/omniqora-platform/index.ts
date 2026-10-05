// deno-fmt-ignore-file
// deno-lint-ignore-file no-explicit-any
import {z} from "zod";
import {decryptSecret,encryptSecret} from "../_shared/integration-crypto.ts";
import {constantTimeEqual,env,json,preflight,requirePost} from "../_shared/http.ts";
import {requireUser,serviceClient} from "../_shared/supabase.ts";
const COUNTRY_CODE="GB",TIMEZONE="Europe/London",LOCALE="en-GB";
const uuid=z.string().uuid(),httpsUrl=z.string().url().refine(v=>v.startsWith("https://"));
const Input=z.discriminatedUnion("action",[
 z.object({action:z.literal("provision_workspace"),omniqoraTenantId:uuid,businessName:z.string().trim().min(2).max(160),slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64),mode:z.enum(["standalone","dishbee-addon"]),existingOrganizationId:uuid.nullish(),locationName:z.string().trim().min(1).max(160).default("Main site"),address:z.record(z.string(),z.unknown()).default({})}),
 z.object({action:z.literal("bind_control_plane"),omniqoraTenantId:uuid,organizationId:uuid,controlPlaneUrl:httpsUrl,intelligenceUrl:httpsUrl,controlPlaneKey:z.string().regex(/^oqcp_[a-f0-9]{64}$/)}),
 z.object({action:z.literal("bind_dishbee_runtime"),omniqoraTenantId:uuid,organizationId:uuid,dishbeeTenantId:uuid,runtimeToken:z.string().min(32).max(512),locations:z.array(z.object({dishbeeLocationId:uuid,haccoraLocationId:uuid})).min(1).max(200)}),
 z.object({action:z.literal("provision_location"),omniqoraTenantId:uuid,organizationId:uuid,omniqoraLocationId:uuid,name:z.string().trim().min(1).max(160),address:z.record(z.string(),z.unknown()).default({}),timezone:z.string().trim().min(1).max(80).default(TIMEZONE)}),
 z.object({action:z.literal("status")}),
 z.object({action:z.literal("ai_start"),kind:z.enum(["compliance_question","inspection_readiness","allergen_review","corrective_action_review","haccp_review","regulatory_question"]),question:z.string().trim().min(10).max(3000)}),
 z.object({action:z.literal("ai_status"),runId:uuid}),
 z.object({action:z.literal("validate_projection"),omniqoraTenantId:uuid,sourceProduct:z.literal("dishbee"),sourceEventId:z.string().min(1).max(160),entityType:z.enum(["location","user","menu_item","recipe","ingredient","supplier","equipment"]),externalId:z.string().min(1).max(200),operation:z.enum(["upsert","archive"]),revision:z.number().int().min(1),payload:z.record(z.string(),z.unknown()).default({})}),
 z.object({action:z.literal("sync_projection"),omniqoraTenantId:uuid,sourceProduct:z.literal("dishbee"),sourceEventId:z.string().min(1).max(160),entityType:z.enum(["location","user","menu_item","recipe","ingredient","supplier","equipment"]),externalId:z.string().min(1).max(200),operation:z.enum(["upsert","archive"]),revision:z.number().int().min(1),payload:z.record(z.string(),z.unknown()).default({})}),
 z.object({action:z.literal("compliance_summary"),omniqoraTenantId:uuid})
]);
async function readInput(r:Request){const n=Number(r.headers.get("content-length")??"0");if(Number.isFinite(n)&&n>65536)throw new Error("body_too_large");const raw=await r.text();if(new TextEncoder().encode(raw).byteLength>65536)throw new Error("body_too_large");return Input.parse(JSON.parse(raw));}
function secret(r:Request,h:string,e:string){const a=r.headers.get(h)??"",b=env(e);return a.length>=32&&b.length>=32&&constantTimeEqual(a,b);}
function url(v:string){const u=new URL(v);if(u.protocol!=="https:")throw new Error("https_required");return u.toString();}
async function actor(r:Request){const {client,user}=await requireUser(r);const {data,error}=await client.rpc("get_my_context");if(error)throw error;const x=(data??{}) as Record<string,unknown>;const organizationId=typeof x.organization_id==="string"?x.organization_id:null,role=typeof x.role==="string"?x.role:"";if(!organizationId)throw new Error("workspace_required");return{user,organizationId,role};}
async function snapshot(c:any){if(!c.control_plane_url||!c.encrypted_control_plane_key)throw new Error("control_plane_not_bound");const key=await decryptSecret(c.encrypted_control_plane_key);const res=await fetch(url(c.control_plane_url),{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({productKey:"haccora",externalTenantId:c.organization_id})});if(!res.ok)throw new Error(`control_plane_${res.status}`);const s=await res.json() as Record<string,any>;if(s.productKey!=="haccora"||s.internalTenantId!==c.omniqora_tenant_id||s.externalTenantId!==c.organization_id||s.tenant?.country_code!==COUNTRY_CODE)throw new Error("control_plane_scope_mismatch");return{s,key};}
const entitled=(s:any,k:string)=>s.entitlements?.[k]?.enabled===true;
async function refresh(db:any,org:string){const q=await db.from("omniqora_connections").select("*").eq("organization_id",org).maybeSingle();if(q.error||!q.data)throw new Error("omniqora_not_connected");try{const {s,key}=await snapshot(q.data);await db.from("omniqora_connections").update({entitlement_snapshot:s,snapshot_generated_at:s.generatedAt??new Date().toISOString(),status:"connected",last_error:null,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("organization_id",org);return{connection:{...q.data,status:"connected"},s,key};}catch(e){await db.from("omniqora_connections").update({status:"degraded",last_error:e instanceof Error?e.message.slice(0,500):"snapshot_failed",updated_at:new Date().toISOString()}).eq("organization_id",org);throw e;}}
async function evidence(db:any,org:string){const today=new Date();today.setHours(0,0,0,0);const week=new Date(Date.now()-7*86400000),thirty=new Date(Date.now()+30*86400000).toISOString().slice(0,10),now=new Date().toISOString().slice(0,10);const count=async(t:string,f?:(q:any)=>any)=>{let q=db.from(t).select("id",{count:"exact",head:true}).eq("organization_id",org);if(f)q=f(q);const r=await q;return r.error?null:(r.count??0);};const [a,b,c,d,e,f]=await Promise.all([count("checks",q=>q.neq("status","completed").gte("created_at",today.toISOString())),count("corrective_actions",q=>q.neq("status","closed")),count("temperature_logs",q=>q.eq("status","out_of_range").gte("logged_at",week.toISOString())),count("incidents",q=>q.neq("status","closed")),count("training_records",q=>q.gte("certificate_valid_to",now).lte("certificate_valid_to",thirty)),count("site_safe_methods",q=>q.eq("status","adopted"))]);return{generatedAt:new Date().toISOString(),jurisdiction:COUNTRY_CODE,locale:LOCALE,openChecks:a,openCorrectiveActions:b,temperatureExceptions7d:c,openIncidents:d,trainingDue30d:e,adoptedSafeMethods:f};}
async function sha256Hex(value:string){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function ensureDishbeeServiceActor(db:any,organizationId:string,defaultLocationId:string){
 const email=`dishbee-runtime-${organizationId}@integration.haccora.invalid`;
 const existingConnection=await db.from("dishbee_runtime_connections").select("actor_user_id").eq("organization_id",organizationId).maybeSingle();
 if(existingConnection.data?.actor_user_id)return String(existingConnection.data.actor_user_id);
 let user:any=null;
 for(let page=1;page<=20&&!user;page++){
   const listed=await db.auth.admin.listUsers({page,perPage:200});
   if(listed.error)throw listed.error;
   user=listed.data.users.find((candidate:any)=>String(candidate.email??"").toLowerCase()===email);
   if(listed.data.users.length<200)break;
 }
 if(!user){
   const created=await db.auth.admin.createUser({
     email,email_confirm:true,
     user_metadata:{system_actor:true,source:"dishbee-runtime",organization_id:organizationId},
   });
   if(created.error||!created.data.user)throw created.error??new Error("dishbee_runtime_actor_create_failed");
   user=created.data.user;
 }
 const membership=await db.from("organization_memberships").upsert({
   organization_id:organizationId,user_id:user.id,role:"staff",status:"active",
   default_location_id:defaultLocationId,accepted_at:new Date().toISOString(),
 }).select("id").single();
 if(membership.error)throw membership.error;
 return String(user.id);
}
async function intelligence(c:any,key:string,body:Record<string,unknown>){if(!c.intelligence_url)throw new Error("intelligence_not_bound");const res=await fetch(url(c.intelligence_url),{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(body)});const data=await res.json().catch(()=>({error:"invalid_response"}));if(!res.ok)throw new Error(String((data as any).error??`intelligence_${res.status}`));return data as any;}
Deno.serve(async r=>{const early=preflight(r)??requirePost(r);if(early)return early;try{const i=await readInput(r),db=serviceClient();
 if(i.action==="provision_workspace"){if(!secret(r,"x-omniqora-provisioning-secret","OMNIQORA_PROVISIONING_SECRET"))return json(r,{error:"forbidden"},403);const old=await db.from("omniqora_connections").select("organization_id,mode,status").eq("omniqora_tenant_id",i.omniqoraTenantId).maybeSingle();if(old.data)return json(r,{ok:true,organizationId:old.data.organization_id,status:old.data.status,idempotent:true});let organizationId=i.existingOrganizationId??null,locationId:string|null=null;if(i.mode==="standalone"&&!organizationId)return json(r,{error:"standalone_requires_existing_haccora_workspace"},409);if(organizationId){const o=await db.from("organizations").select("id,country_code").eq("id",organizationId).maybeSingle();if(!o.data||o.data.country_code!==COUNTRY_CODE)return json(r,{error:"existing_workspace_country_mismatch"},409);}else{const slug=`${i.slug.slice(0,54)}-${i.omniqoraTenantId.slice(0,8)}`;const o=await db.from("organizations").insert({name:i.businessName,slug,country_code:COUNTRY_CODE,timezone:TIMEZONE,enabled_modules:["haccp","temperature","cleaning","menu","purchasing","rota","training","audits"],created_by:null}).select("id").single();if(o.error)throw o.error;organizationId=o.data.id;const l=await db.from("locations").insert({organization_id:organizationId,name:i.locationName,timezone:TIMEZONE,address:{...i.address,country:COUNTRY_CODE}}).select("id").single();if(l.error)throw l.error;locationId=l.data.id;}const ins=await db.from("omniqora_connections").insert({organization_id:organizationId,omniqora_tenant_id:i.omniqoraTenantId,mode:i.mode,country_code:COUNTRY_CODE,status:"provisioned"});if(ins.error)throw ins.error;return json(r,{ok:true,organizationId,locationId,status:"provisioned"},201);}
 if(i.action==="bind_control_plane"){if(!secret(r,"x-omniqora-provisioning-secret","OMNIQORA_PROVISIONING_SECRET"))return json(r,{error:"forbidden"},403);const cur=await db.from("omniqora_connections").select("*").eq("organization_id",i.organizationId).eq("omniqora_tenant_id",i.omniqoraTenantId).maybeSingle();if(!cur.data)return json(r,{error:"workspace_not_provisioned"},404);const probe={...cur.data,control_plane_url:url(i.controlPlaneUrl),intelligence_url:url(i.intelligenceUrl),encrypted_control_plane_key:await encryptSecret(i.controlPlaneKey)};const {s}=await snapshot(probe);const up=await db.from("omniqora_connections").update({control_plane_url:probe.control_plane_url,intelligence_url:probe.intelligence_url,encrypted_control_plane_key:probe.encrypted_control_plane_key,entitlement_snapshot:s,snapshot_generated_at:s.generatedAt??new Date().toISOString(),status:"connected",last_error:null,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("organization_id",i.organizationId);if(up.error)throw up.error;return json(r,{ok:true,organizationId:i.organizationId,status:"connected"});}
 if(i.action==="provision_location"){
   if(!secret(r,"x-omniqora-provisioning-secret","OMNIQORA_PROVISIONING_SECRET"))return json(r,{error:"forbidden"},403);
   const cn=await db.from("omniqora_connections").select("organization_id,omniqora_tenant_id,status").eq("organization_id",i.organizationId).eq("omniqora_tenant_id",i.omniqoraTenantId).maybeSingle();
   if(!cn.data||cn.data.status==="disabled")return json(r,{error:"workspace_not_connected"},404);
   const existing=await db.from("omniqora_location_links").select("haccora_location_id").eq("organization_id",i.organizationId).eq("omniqora_location_id",i.omniqoraLocationId).maybeSingle();
   if(existing.error)throw existing.error;
   if(existing.data){
     return json(r,{ok:true,organizationId:i.organizationId,omniqoraLocationId:i.omniqoraLocationId,haccoraLocationId:existing.data.haccora_location_id,idempotent:true});
   }
   const loc=await db.from("locations").insert({
     organization_id:i.organizationId,name:i.name,timezone:i.timezone,
     address:{...i.address,country:COUNTRY_CODE,omniqoraLocationId:i.omniqoraLocationId},
   }).select("id").single();
   if(loc.error)throw loc.error;
   const link=await db.from("omniqora_location_links").insert({
     organization_id:i.organizationId,omniqora_tenant_id:i.omniqoraTenantId,
     omniqora_location_id:i.omniqoraLocationId,haccora_location_id:loc.data.id,
   });
   if(link.error)throw link.error;
   return json(r,{ok:true,organizationId:i.organizationId,omniqoraLocationId:i.omniqoraLocationId,haccoraLocationId:loc.data.id},201);
 }
 if(i.action==="bind_dishbee_runtime"){
   if(!secret(r,"x-omniqora-provisioning-secret","OMNIQORA_PROVISIONING_SECRET"))return json(r,{error:"forbidden"},403);
   const cn=await db.from("omniqora_connections").select("organization_id,omniqora_tenant_id,status").eq("organization_id",i.organizationId).eq("omniqora_tenant_id",i.omniqoraTenantId).maybeSingle();
   if(!cn.data||cn.data.status!=="connected")return json(r,{error:"control_plane_not_connected"},409);
   for(const mapping of i.locations){
     const loc=await db.from("locations").select("id,organization_id").eq("id",mapping.haccoraLocationId).eq("organization_id",i.organizationId).maybeSingle();
     if(!loc.data)return json(r,{error:"haccora_location_mapping_invalid"},409);
   }
   const actorId=await ensureDishbeeServiceActor(db,i.organizationId,i.locations[0].haccoraLocationId);
   const tokenHash=await sha256Hex(i.runtimeToken);
   const connection=await db.from("dishbee_runtime_connections").upsert({
     organization_id:i.organizationId,dishbee_tenant_id:i.dishbeeTenantId,
     token_hash:tokenHash,actor_user_id:actorId,status:"live",
     metadata:{configuredBy:"omniqora-saas-factory",omniqoraTenantId:i.omniqoraTenantId},
     last_error:null,updated_at:new Date().toISOString(),
   },{onConflict:"organization_id"}).select("id").single();
   if(connection.error)throw connection.error;
   const deleted=await db.from("dishbee_runtime_locations").delete().eq("connection_id",connection.data.id);
   if(deleted.error)throw deleted.error;
   const mapped=await db.from("dishbee_runtime_locations").insert(i.locations.map(mapping=>({
     connection_id:connection.data.id,organization_id:i.organizationId,
     dishbee_location_id:mapping.dishbeeLocationId,haccora_location_id:mapping.haccoraLocationId,
     active:true,
   })));
   if(mapped.error)throw mapped.error;
   await db.from("platform_audit_events").insert({
     actor_id:actorId,event_type:"dishbee_runtime_bound",
     metadata:{organization_id:i.organizationId,dishbee_tenant_id:i.dishbeeTenantId,location_count:i.locations.length,omniqora_tenant_id:i.omniqoraTenantId},
   });
   return json(r,{ok:true,status:"connected",organizationId:i.organizationId,dishbeeTenantId:i.dishbeeTenantId,actorUserId:actorId,locationCount:i.locations.length});
 }
 if(i.action==="validate_projection"){if(!secret(r,"x-omniqora-sync-secret","OMNIQORA_SYNC_SECRET"))return json(r,{error:"forbidden"},403);const cn=await db.from("omniqora_connections").select("organization_id,status").eq("omniqora_tenant_id",i.omniqoraTenantId).maybeSingle();if(!cn.data||cn.data.status==="disabled")return json(r,{error:"workspace_not_connected"},404);return json(r,{ok:true,valid:true,persisted:false,reviewRequired:true,organizationId:cn.data.organization_id,sourceProduct:i.sourceProduct,sourceEventId:i.sourceEventId,entityType:i.entityType,externalId:i.externalId,operation:i.operation,revision:i.revision});}
 if(i.action==="sync_projection"){if(!secret(r,"x-omniqora-sync-secret","OMNIQORA_SYNC_SECRET"))return json(r,{error:"forbidden"},403);const cn=await db.from("omniqora_connections").select("organization_id,status").eq("omniqora_tenant_id",i.omniqoraTenantId).maybeSingle();if(!cn.data||cn.data.status==="disabled")return json(r,{error:"workspace_not_connected"},404);const p=await db.from("omniqora_projection_inbox").select("id,source_revision").eq("organization_id",cn.data.organization_id).eq("source_product",i.sourceProduct).eq("source_event_id",i.sourceEventId).maybeSingle();if(p.data&&p.data.source_revision>=i.revision)return json(r,{ok:true,projectionId:p.data.id,idempotent:true});const vals={organization_id:cn.data.organization_id,source_product:i.sourceProduct,source_event_id:i.sourceEventId,entity_type:i.entityType,external_id:i.externalId,operation:i.operation,source_revision:i.revision,payload:i.payload,status:"received",updated_at:new Date().toISOString()};const q=p.data?db.from("omniqora_projection_inbox").update(vals).eq("id",p.data.id):db.from("omniqora_projection_inbox").insert(vals);const saved=await q.select("id").single();if(saved.error)throw saved.error;return json(r,{ok:true,projectionId:saved.data.id,reviewRequired:true},p.data?200:201);}
 if(i.action==="compliance_summary"){if(!secret(r,"x-omniqora-sync-secret","OMNIQORA_SYNC_SECRET"))return json(r,{error:"forbidden"},403);const cn=await db.from("omniqora_connections").select("organization_id,status").eq("omniqora_tenant_id",i.omniqoraTenantId).maybeSingle();if(!cn.data||cn.data.status==="disabled")return json(r,{error:"workspace_not_connected"},404);return json(r,{ok:true,organizationId:cn.data.organization_id,summary:await evidence(db,cn.data.organization_id)});}
 const a=await actor(r);if(i.action==="status"){try{const x=await refresh(db,a.organizationId);return json(r,{ok:true,connected:true,countryCode:COUNTRY_CODE,mode:x.connection.mode,generatedAt:x.s.generatedAt,entitlements:x.s.entitlements??{}});}catch{return json(r,{ok:true,connected:false,countryCode:COUNTRY_CODE,entitlements:{}});}}
 if(!["owner","manager","chef"].includes(a.role))return json(r,{error:"forbidden"},403);const x=await refresh(db,a.organizationId);if(!entitled(x.s,"haccora.ai-copilot"))return json(r,{error:"haccora_ai_not_entitled"},403);
 if(i.action==="ai_start"){const ev=await evidence(db,a.organizationId),refs=["haccora:checks","haccora:corrective_actions","haccora:temperature_logs","haccora:incidents","haccora:training_records","haccora:site_safe_methods"];const out=await intelligence(x.connection,x.key,{operation:"run.start",tenantId:x.s.internalTenantId,productKey:"haccora",profile:"compliance",goal:`Haccora ${i.kind}: ${i.question}\nReturn evidence-grounded draft guidance only. Cite supplied source references, identify uncertainty, require human review for any compliance-impacting recommendation, and never certify legal compliance or a hygiene rating.`,maxSteps:8,inputVersion:"haccora-gb-v1",context:{jurisdiction:COUNTRY_CODE,locale:LOCALE,evidence:ev},sourceRefs:refs});const saved=await db.from("omniqora_ai_runs").insert({omniqora_run_id:out.runId,organization_id:a.organizationId,requested_by:a.user.id,request_kind:i.kind,status:out.status??"queued"});if(saved.error)throw saved.error;return json(r,{ok:true,runId:out.runId,status:out.status??"queued",reviewRequired:true},202);}
 const local=await db.from("omniqora_ai_runs").select("*").eq("omniqora_run_id",i.runId).eq("organization_id",a.organizationId).maybeSingle();if(!local.data)return json(r,{error:"run_not_found"},404);const out=await intelligence(x.connection,x.key,{operation:"run.get",tenantId:x.s.internalTenantId,productKey:"haccora",runId:i.runId});const st=out.run?.status??local.data.status;await db.from("omniqora_ai_runs").update({status:st,completed_at:st==="completed"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("omniqora_run_id",i.runId);return json(r,{ok:true,...out,reviewRequired:true});
 }catch(e){const m=e instanceof Error?e.message:"request_failed";console.error("omniqora-platform",m);const st=m==="Unauthorized"?401:m==="body_too_large"?413:e instanceof z.ZodError||m.includes("JSON")?422:400;return json(r,{error:st===401?"unauthorized":"request_failed"},st);}});
