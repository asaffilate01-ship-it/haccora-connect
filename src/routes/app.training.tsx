import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Award,
  PlayCircle,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app/training")({ component: TrainingPage });

interface Course {
  id: string;
  title_de: string;
  title_en: string;
  minutes: number;
  modules: number;
  required: boolean;
}
interface Record_ {
  id: string;
  user_id: string;
  course_id: string | null;
  progress: number;
  completed_at: string | null;
  score: number | null;
  certificate_valid_to: string | null;
  verified_at: string | null;
  verified_by: string | null;
}

const QUIZ = [
  {
    enQ: "Which cooking treatment is an FSA-recognised safe time and temperature combination?",
    a: ["63 °C for 30 seconds", "70 °C for 2 minutes", "74 °C for 1 second", "82 °C for 1 second"],
    correct: 1,
  },
  {
    enQ: "How many regulated food allergens must UK food businesses declare?",
    a: ["8", "10", "12", "14"],
    correct: 3,
  },
  {
    enQ: "What is the legal maximum temperature for most chilled food in England, Wales and Northern Ireland?",
    a: ["5 °C", "8 °C", "10 °C", "12 °C"],
    correct: 1,
  },
  {
    enQ: "When must hands be washed?",
    a: [
      "Only at the start of a shift",
      "After contamination and when changing tasks",
      "Once per hour",
      "Only after breaks",
    ],
    correct: 1,
  },
  {
    enQ: "What is required after a CCP deviation?",
    a: [
      "Delete the record",
      "Only repeat the reading",
      "Record the corrective action",
      "Wait until the end of the day",
    ],
    correct: 2,
  },
];

function TrainingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const role = user?.role ?? "staff";
  const canSeeAll = role === "owner" || role === "manager" || role === "inspector";
  const canVerify = role === "owner" || role === "manager";

  const [tab, setTab] = useState<"team" | "courses" | "quiz" | "certs">("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<Record_[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: r }, { data: p }] = await Promise.all([
      supabase.from("training_courses").select("*").order("required", { ascending: false }),
      supabase.from("training_records").select("*"),
      supabase.from("profiles").select("id,full_name"),
    ]);
    setCourses((c ?? []) as Course[]);
    setRecords((r ?? []) as Record_[]);
    setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.full_name ?? ""])));
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const myRecord = (courseId: string) =>
    records.find((r) => r.course_id === courseId && r.user_id === user?.id);

  const startCourse = async (course: Course) => {
    if (!user) return;
    const existing = myRecord(course.id);
    if (existing) {
      await supabase
        .from("training_records")
        .update({
          progress: Math.max(existing.progress, 10),
          completed_at: null,
          score: null,
          certificate_valid_to: null,
          verified_at: null,
          verified_by: null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("training_records").insert({
        user_id: user.id,
        course_id: course.id,
        progress: 10,
      });
    }
    setActiveCourse(course);
    setTab("quiz");
    await load();
  };

  const completeQuiz = async (score: number) => {
    if (!user || !activeCourse) return;
    const percentage = Math.round((score / QUIZ.length) * 100);
    const passed = percentage >= 80;
    await supabase
      .from("training_records")
      .update({
        progress: passed ? 100 : 50,
        completed_at: passed ? new Date().toISOString() : null,
        score: percentage,
        certificate_valid_to: null,
        verified_at: null,
        verified_by: null,
      })
      .eq("user_id", user.id)
      .eq("course_id", activeCourse.id);
    await load();
  };

  const verifyRecord = async (record: Record_) => {
    if (!user || !canVerify || !record.completed_at) return;
    await supabase
      .from("training_records")
      .update({
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        verification_note: "Completion and identity checked by organization manager",
      })
      .eq("id", record.id);
    await load();
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <div className="eyebrow">Food-handler fitness-to-work · food hygiene · LMS</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{t("training.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("training.sub")}</p>
      </div>

      <div className="inline-flex flex-wrap rounded-full border border-border bg-card p-1 text-sm">
        <TabBtn
          on={tab === "courses"}
          onClick={() => setTab("courses")}
          icon={BookOpen}
          label={"Courses"}
        />
        {canSeeAll && (
          <TabBtn
            on={tab === "team"}
            onClick={() => setTab("team")}
            icon={ShieldCheck}
            label={"Team"}
          />
        )}
        <TabBtn
          on={tab === "quiz"}
          onClick={() => setTab("quiz")}
          icon={GraduationCap}
          label={"Knowledge test"}
        />
        <TabBtn
          on={tab === "certs"}
          onClick={() => setTab("certs")}
          icon={Award}
          label={"Certificates"}
        />
      </div>

      {loading ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          <Loader2 size={16} className="inline animate-spin mr-2" />…
        </div>
      ) : tab === "courses" ? (
        <div className="grid md:grid-cols-2 gap-4">
          {courses.map((c) => {
            const rec = myRecord(c.id);
            const pct = rec?.progress ?? 0;
            return (
              <div key={c.id} className="surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {c.minutes} min · {c.modules} {"modules"}
                    </div>
                    <div className="font-display text-lg leading-tight mt-0.5">{c.title_en}</div>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${c.required ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground"}`}
                  >
                    {c.required ? "Required" : "Recommended"}
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{rec?.completed_at ? "Completed" : `${pct}%`}</span>
                  <button
                    onClick={() => startCourse(c)}
                    className="text-primary font-semibold inline-flex items-center gap-1"
                  >
                    <PlayCircle size={12} />
                    {rec?.completed_at ? "Retake" : "Start"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === "team" && canSeeAll ? (
        <div className="surface overflow-hidden">
          <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
            <div className="col-span-4">{"Staff"}</div>
            <div className="col-span-3">{"Course"}</div>
            <div className="col-span-2">{"Progress"}</div>
            <div className="col-span-3">{"Valid to"}</div>
          </div>
          <ul className="divide-y divide-border">
            {records.length === 0 && (
              <li className="p-6 text-sm text-muted-foreground text-center">{"No records yet."}</li>
            )}
            {records.map((r) => {
              const c = courses.find((x) => x.id === r.course_id);
              return (
                <li key={r.id} className="grid grid-cols-12 items-center px-5 py-3 text-sm">
                  <div className="col-span-4">{profiles[r.user_id] ?? r.user_id.slice(0, 8)}</div>
                  <div className="col-span-3 text-xs">{c?.title_en ?? "—"}</div>
                  <div className="col-span-2">
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${r.progress}%` }} />
                    </div>
                  </div>
                  <div className="col-span-3 text-xs">
                    {r.verified_at ? (
                      <span className="font-mono">{r.verified_at.slice(0, 10)}</span>
                    ) : r.completed_at && canVerify ? (
                      <button
                        onClick={() => verifyRecord(r)}
                        className="font-semibold text-primary"
                      >
                        {"Verify"}
                      </button>
                    ) : (
                      "Pending"
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : tab === "quiz" ? (
        activeCourse ? (
          <QuizView key={activeCourse.id} course={activeCourse} onComplete={completeQuiz} />
        ) : (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            {"Start a course first."}
          </div>
        )
      ) : (
        <div className="surface overflow-hidden">
          <div className="grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
            <div className="col-span-4">{"Staff"}</div>
            <div className="col-span-4">{"Certificate"}</div>
            <div className="col-span-2">{"Completed"}</div>
            <div className="col-span-2">{"Valid to"}</div>
          </div>
          <ul className="divide-y divide-border">
            {records.filter((r) => r.verified_at).length === 0 && (
              <li className="p-6 text-sm text-muted-foreground text-center">
                {"No verified records yet."}
              </li>
            )}
            {records
              .filter((r) => r.verified_at)
              .map((r) => {
                const c = courses.find((x) => x.id === r.course_id);
                return (
                  <li key={r.id} className="grid grid-cols-12 items-center px-5 py-3 text-sm">
                    <div className="col-span-4 flex items-center gap-2">
                      <Award size={14} className="text-primary" />
                      {profiles[r.user_id] ?? "—"}
                    </div>
                    <div className="col-span-4">{c?.title_en ?? "—"}</div>
                    <div className="col-span-2 text-xs font-mono">
                      {r.completed_at?.slice(0, 10)}
                    </div>
                    <div className="col-span-2 text-xs font-mono">
                      {r.certificate_valid_to ?? "External"}
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      <div className="surface p-5 flex items-center gap-3">
        <ShieldCheck size={20} className="text-primary" />
        <p className="text-xs text-muted-foreground">
          {t("training.privacy")}{" "}
          {
            "Internal course completion does not replace an official Food-handler health briefing; external evidence must be uploaded and verified."
          }
        </p>
      </div>
    </div>
  );
}

function TabBtn({
  on,
  onClick,
  icon: Icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: typeof BookOpen;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
    >
      <Icon size={14} className="inline mr-1.5" />
      {label}
    </button>
  );
}

function QuizView({
  course,
  onComplete,
}: {
  course: Course;
  onComplete: (score: number) => Promise<void>;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [saved, setSaved] = useState(false);
  const q = QUIZ[i];
  const done = i >= QUIZ.length;

  if (done) {
    const percentage = Math.round((score / QUIZ.length) * 100);
    const passed = percentage >= 80;
    return (
      <div className="surface p-10 text-center">
        <CheckCircle2
          size={40}
          className={`mx-auto mb-2 ${passed ? "text-success" : "text-warning"}`}
        />
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {course.title_en}
        </div>
        <div className="font-display text-2xl">
          {"Result"}: {percentage}%
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {passed ? "Passed – awaiting verification." : "Not passed. At least 80% is required."}
        </p>
        {!saved && (
          <button
            className="btn-alert-solid mt-4"
            onClick={async () => {
              await onComplete(score);
              setSaved(true);
            }}
          >
            {"Save result"}
          </button>
        )}
        <button
          className="btn-outline mt-4 ml-2"
          onClick={() => {
            setI(0);
            setPicked(null);
            setScore(0);
            setSaved(false);
          }}
        >
          {"Restart"}
        </button>
      </div>
    );
  }

  return (
    <div className="surface p-6 space-y-4 max-w-2xl">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {"Question"} {i + 1} / {QUIZ.length}
      </div>
      <div className="font-display text-xl">{q.enQ}</div>
      <div className="grid gap-2">
        {q.a.map((a, idx) => {
          const isPicked = picked === idx;
          const isCorrect = picked !== null && idx === q.correct;
          const isWrong = isPicked && idx !== q.correct;
          return (
            <button
              key={idx}
              disabled={picked !== null}
              onClick={() => setPicked(idx)}
              className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                isCorrect
                  ? "border-success bg-success/10"
                  : isWrong
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:bg-secondary/60"
              }`}
            >
              {a}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button
          className="btn-alert-solid"
          onClick={() => {
            if (picked === q.correct) setScore((s) => s + 1);
            setPicked(null);
            setI((n) => n + 1);
          }}
        >
          {"Next"}
        </button>
      )}
    </div>
  );
}
