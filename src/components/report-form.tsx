"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActiveProperty } from "@/lib/services/properties";
import {
  ACCEPTED_IMAGE_TYPES,
  CATEGORY_OPTIONS,
  categoryLabel,
  ticketFormSchema,
  validatePhotoFile,
  type CategoryValue,
} from "@/lib/validation/ticket";

type FieldErrors = Record<string, string>;

interface Summary {
  reference: number;
  category: CategoryValue;
  description: string;
  propertyAddress: string;
}

export function ReportForm({ properties }: { properties: ActiveProperty[] }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);

  function focusField(name: string) {
    document.getElementById(name)?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const fd = new FormData(event.currentTarget);

    const candidate = {
      tenantName: String(fd.get("tenantName") ?? ""),
      tenantEmail: String(fd.get("tenantEmail") ?? ""),
      tenantPhone: String(fd.get("tenantPhone") ?? ""),
      propertyId: String(fd.get("propertyId") ?? ""),
      category: String(fd.get("category") ?? ""),
      description: String(fd.get("description") ?? ""),
    };

    const nextErrors: FieldErrors = {};
    const parsed = ticketFormSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
    }
    const photo = fd.get("photo");
    const photoError = validatePhotoFile(photo instanceof File ? photo : null);
    if (photoError) nextErrors.photo = photoError;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusField(Object.keys(nextErrors)[0]);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", { method: "POST", body: fd });
      const data: {
        ok: boolean;
        ticket?: { id: string; reference: number };
        fieldErrors?: FieldErrors;
        error?: string;
      } = await res.json().catch(() => ({ ok: false }));

      if (res.ok && data.ok && data.ticket) {
        const address =
          properties.find((p) => p.id === candidate.propertyId)?.address ?? "";
        setSummary({
          reference: data.ticket.reference,
          category: candidate.category as CategoryValue,
          description: candidate.description,
          propertyAddress: address,
        });
        return;
      }
      if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        setErrors(data.fieldErrors);
        focusField(Object.keys(data.fieldErrors)[0]);
        return;
      }
      setFormError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setFormError(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function submitAnother() {
    setSummary(null);
    setErrors({});
    setFormError(null);
    formRef.current?.reset();
  }

  if (summary) {
    return (
      <div
        className="rounded-lg border border-success/40 bg-success/5 p-6"
        role="status"
      >
        <h2 className="text-xl font-semibold text-foreground">
          Request received
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your reference is{" "}
          <span className="font-semibold text-foreground">
            #{summary.reference}
          </span>
          . You&apos;ll receive a confirmation email shortly.
        </p>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium">Property:</dt>
            <dd className="text-muted-foreground">{summary.propertyAddress}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Category:</dt>
            <dd className="text-muted-foreground">
              {categoryLabel(summary.category)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Issue:</dt>
            <dd className="line-clamp-3 text-muted-foreground">
              {summary.description}
            </dd>
          </div>
        </dl>
        <Button className="mt-6" onClick={submitAnother}>
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
    >
      <Field
        id="tenantName"
        label="Your name"
        error={errors.tenantName}
        required
      >
        <Input
          id="tenantName"
          name="tenantName"
          autoComplete="name"
          aria-invalid={Boolean(errors.tenantName)}
          aria-describedby={errors.tenantName ? "tenantName-error" : undefined}
        />
      </Field>

      <Field
        id="tenantEmail"
        label="Email"
        error={errors.tenantEmail}
        required
      >
        <Input
          id="tenantEmail"
          name="tenantEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.tenantEmail)}
          aria-describedby={errors.tenantEmail ? "tenantEmail-error" : undefined}
        />
      </Field>

      <Field
        id="tenantPhone"
        label="Phone"
        error={errors.tenantPhone}
        required
      >
        <Input
          id="tenantPhone"
          name="tenantPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={Boolean(errors.tenantPhone)}
          aria-describedby={errors.tenantPhone ? "tenantPhone-error" : undefined}
        />
      </Field>

      <Field
        id="propertyId"
        label="Property"
        error={errors.propertyId}
        required
      >
        <NativeSelect
          id="propertyId"
          name="propertyId"
          defaultValue=""
          aria-invalid={Boolean(errors.propertyId)}
          aria-describedby={errors.propertyId ? "propertyId-error" : undefined}
        >
          <option value="" disabled>
            Select your property…
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.address}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field id="category" label="Category" error={errors.category} required>
        <NativeSelect
          id="category"
          name="category"
          defaultValue=""
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? "category-error" : undefined}
        >
          <option value="" disabled>
            Select a category…
          </option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        id="description"
        label="Describe the issue"
        error={errors.description}
        required
      >
        <Textarea
          id="description"
          name="description"
          rows={5}
          maxLength={2000}
          placeholder="Tell us what's wrong, and where in the property…"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
      </Field>

      <Field
        id="photo"
        label="Photo (optional)"
        error={errors.photo}
        hint="One JPEG or PNG image, up to 10 MB."
      >
        <Input
          id="photo"
          name="photo"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-secondary-foreground"
          aria-invalid={Boolean(errors.photo)}
          aria-describedby={errors.photo ? "photo-error" : "photo-hint"}
        />
      </Field>

      {/* Honeypot — visually hidden, ignored by humans, filled by bots (§5). */}
      <div aria-hidden className="hidden">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
