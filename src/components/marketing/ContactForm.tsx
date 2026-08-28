import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/haccora-client";
import { isSupabaseConfigured } from "@/integrations/supabase/config";
import { PUBLIC_CONFIG } from "@/lib/public-config";

export function ContactCard() {
  const { t, lang } = useI18n();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState("sending");
    setError("");
    if (!isSupabaseConfigured()) {
      setState("error");
      setError(`The form is temporarily unavailable. Email ${PUBLIC_CONFIG.legal.email}.`);
      return;
    }
    const form = new FormData(formElement);
    const siteCount = String(form.get("siteCount") ?? "").trim();
    try {
      const { error: invokeError } = await supabase.functions.invoke("contact", {
        body: {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: form.get("phone"),
          businessName: form.get("businessName"),
          enquiryType: form.get("enquiryType"),
          siteCount: siteCount ? Number(siteCount) : null,
          message: form.get("message"),
          website: form.get("website"),
          locale: lang,
          consent: form.get("consent") === "on",
        },
      });
      if (invokeError) throw invokeError;
    } catch {
      setState("error");
      setError(`Your request could not be sent. Email ${PUBLIC_CONFIG.legal.email}.`);
      return;
    }
    formElement.reset();
    setState("sent");
  };
  return (
    <form
      id="contact"
      onSubmit={submit}
      className="rounded-2xl md:rounded-3xl bg-white p-5 md:p-8 shadow-2xl border border-black/5"
    >
      <h3 className="display-black text-xl md:text-3xl text-black text-center">
        {t("contact.title") ?? "Get More Information"}
      </h3>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          name="firstName"
          aria-label={t("contact.first") ?? "First Name"}
          required
          autoComplete="given-name"
          maxLength={80}
          placeholder={t("contact.first") ?? "First Name"}
          className="fld"
        />
        <input
          name="lastName"
          aria-label={t("contact.last") ?? "Last Name"}
          required
          autoComplete="family-name"
          maxLength={80}
          placeholder={t("contact.last") ?? "Last Name"}
          className="fld"
        />
      </div>
      <div className="mt-3 grid gap-3">
        <input
          name="email"
          aria-label={t("contact.email") ?? "Email Address"}
          required
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder={t("contact.email") ?? "Email Address"}
          className="fld"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            name="enquiryType"
            aria-label="How can we help?"
            required
            defaultValue=""
            className="fld"
          >
            <option value="" disabled>
              How can we help?
            </option>
            <option value="demo">Book a product walkthrough</option>
            <option value="migration">Move from paper or another system</option>
            <option value="sales">Plans and pricing</option>
            <option value="partnership">Partnership or integration</option>
            <option value="support">Existing-customer support</option>
            <option value="general">Something else</option>
          </select>
          <input
            name="siteCount"
            aria-label="Number of premises"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            placeholder="Number of premises"
            className="fld"
          />
        </div>
        <textarea
          name="message"
          aria-label="Tell us what you need"
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          placeholder="Tell us what you need, how you record food safety today and any timescale."
          className="fld min-h-24 resize-y"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="phone"
            aria-label={t("contact.phone") ?? "Phone Number"}
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder={t("contact.phone") ?? "Phone Number"}
            className="fld"
          />
          <input
            name="businessName"
            aria-label={t("contact.business") ?? "Business Name"}
            autoComplete="organization"
            maxLength={160}
            placeholder={t("contact.business") ?? "Business Name"}
            className="fld"
          />
        </div>
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
      </div>
      <label className="mt-4 flex items-start gap-2 text-[11px] text-black/60">
        <input name="consent" type="checkbox" required className="mt-0.5" />
        <span>
          By submitting this form, you agree to our{" "}
          <Link
            to="/legal/privacy"
            className="font-semibold underline underline-offset-2 hover:text-black"
          >
            privacy policy
          </Link>
          .
        </span>
      </label>
      <button
        disabled={state === "sending"}
        type="submit"
        className="btn-red w-full mt-5 justify-center uppercase tracking-widest text-xs md:text-sm disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : (t("contact.cta") ?? "Get In Touch")}
      </button>
      {state === "sent" && (
        <p role="status" className="mt-3 text-sm text-success text-center">
          {"Thank you. We will be in touch shortly."}
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="mt-3 text-sm text-destructive text-center">
          {error}
        </p>
      )}
    </form>
  );
}
