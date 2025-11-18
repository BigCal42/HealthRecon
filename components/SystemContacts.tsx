"use client";

import { useState, useEffect, useCallback } from "react";

interface SystemContactsProps {
  slug: string;
}

type Contact = {
  id: string;
  full_name: string;
  title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  seniority: string | null;
  role_in_deal: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
};

export function SystemContacts({ slug }: SystemContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [seniority, setSeniority] = useState("");
  const [roleInDeal, setRoleInDeal] = useState("");
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (!cancelled) {
        if (!res.ok) {
          setError(data.error ?? "Failed to load contacts");
          return;
        }

        setContacts(data.contacts ?? []);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }

    setLoading(true);
    setStatus("Saving contact...");
    setError(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          fullName: fullName.trim(),
          title: title.trim() || undefined,
          department: department.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          seniority: seniority || undefined,
          roleInDeal: roleInDeal || undefined,
          notes: notes.trim() || undefined,
          isPrimary,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to save contact");
        return;
      }

      setFullName("");
      setTitle("");
      setDepartment("");
      setEmail("");
      setPhone("");
      setNotes("");
      setIsPrimary(false);
      setStatus("Contact saved.");
      await fetchContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Full Name:{" "}
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Title:{" "}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Department:{" "}
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Email:{" "}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Phone:{" "}
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Seniority:{" "}
            <select
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
            >
              <option value="">(not set)</option>
              <option value="exec">Exec</option>
              <option value="director">Director</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Role in Deal:{" "}
            <select
              value={roleInDeal}
              onChange={(e) => setRoleInDeal(e.target.value)}
            >
              <option value="">(not set)</option>
              <option value="decision_maker">Decision maker</option>
              <option value="influencer">Influencer</option>
              <option value="champion">Champion</option>
              <option value="blocker">Blocker</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Notes:{" "}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "300px", height: "60px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
            />
            Primary contact
          </label>
        </div>
        <button type="submit" disabled={loading}>
          Add Contact
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {status && <p style={{ color: "green" }}>{status}</p>}

      <div>
        <h3>Contacts</h3>
        {loading && contacts.length === 0 ? (
          <p>Loading...</p>
        ) : contacts.length === 0 ? (
          <p>No contacts added yet.</p>
        ) : (
          <ul>
            {contacts.map((c) => (
              <li key={c.id} style={{ marginBottom: "1rem" }}>
                <p>
                  <strong>
                    {c.full_name}
                    {c.is_primary ? " (Primary)" : ""}
                  </strong>
                </p>
                {c.title && <p>{c.title}</p>}
                {(c.department || c.seniority || c.role_in_deal) && (
                  <p>
                    {c.department && <>Dept: {c.department} </>}
                    {c.seniority && <>| Seniority: {c.seniority} </>}
                    {c.role_in_deal && <>| Role: {c.role_in_deal}</>}
                  </p>
                )}
                {(c.email || c.phone) && (
                  <p>
                    {c.email && <>Email: {c.email} </>}
                    {c.phone && <>| Phone: {c.phone}</>}
                  </p>
                )}
                {c.notes && <p>Notes: {c.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

