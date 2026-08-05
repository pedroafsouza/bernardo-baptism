"use client";

import Icon from "@/components/Icon";
import type { AdminDict } from "@/lib/adminI18n";
import { checkPasswordStrength } from "@/lib/passwordPolicy";

/**
 * Live requirement checklist.
 *
 * Runs the exact policy module the API runs, so every line is ticked off the
 * moment it is genuinely satisfied — no more "needs a symbol" on a password
 * that has one, and no more guessing which of four bullet points failed.
 */
export default function PasswordRequirements({
  t,
  password,
  username,
  /** Rules the server rejected, so a disagreement is still shown. */
  serverProblems = [],
}: {
  t: AdminDict;
  password: string;
  username?: string;
  serverProblems?: string[];
}) {
  const { ok, rules } = checkPasswordStrength(password, username);
  const touched = password.length > 0;

  return (
    <div className="bg-white border-4 border-black p-3 text-[13px] mb-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="lock" /> {t.passwordRulesTitle}
      </div>
      <ul className="space-y-1">
        {rules.map((rule) => {
          const failedOnServer = serverProblems.includes(rule.id);
          const met = rule.ok && !failedOnServer;
          return (
            <li
              key={rule.id}
              className={`flex items-start gap-2 ${
                met ? "text-green-700" : touched ? "text-red-600" : "opacity-70"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                <Icon name={met ? "check" : touched ? "close" : "dot"} />
              </span>
              <span>{t.passwordRequirement(rule.id)}</span>
            </li>
          );
        })}
      </ul>
      {touched && ok && serverProblems.length === 0 && (
        <p className="mt-2 flex items-center gap-2 text-green-700">
          <Icon name="check" /> {t.passwordAllRulesMet}
        </p>
      )}
    </div>
  );
}
