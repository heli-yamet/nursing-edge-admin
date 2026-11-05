type Overview = {
  generated_at: string;
  learners: {
    registered: number;
    with_active_access: number;
    active_recently: number;
  };
  recent_activity: {
    attempts_last_7_days: number;
    sessions_last_7_days: number;
  };
  review: {
    due_now: number;
    next_due_at: string | null;
    near_expiry: number;
    expired: number;
    active_cycles: number;
    paused_cycles: number;
  };
};

function whenLabel(value: string | null): string {
  if (!value) {
    return "None scheduled";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#D9E1E5] bg-white p-5">
      <p className="text-sm font-medium text-[#5C6B74]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#163A59]">{value}</p>
      {detail ? (
        <p className="mt-2 text-sm leading-6 text-[#66727A]">{detail}</p>
      ) : null}
    </div>
  );
}

export function OverviewCards({ overview }: { overview: Overview }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-[#66727A]">
        Snapshot generated {whenLabel(overview.generated_at)}. Counts only—no
        scores or charts.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Registered learners"
          value={overview.learners.registered}
        />
        <StatCard
          label="Active access"
          value={overview.learners.with_active_access}
          detail="Entitlements currently active."
        />
        <StatCard
          label="Active in last 30 days"
          value={overview.learners.active_recently}
          detail="Learners with at least one committed attempt."
        />
        <StatCard
          label="Attempts (7 days)"
          value={overview.recent_activity.attempts_last_7_days}
        />
        <StatCard
          label="Sessions started (7 days)"
          value={overview.recent_activity.sessions_last_7_days}
        />
        <StatCard
          label="Review due now"
          value={overview.review.due_now}
          detail={`Next due: ${whenLabel(overview.review.next_due_at)}`}
        />
        <StatCard
          label="Review near expiry"
          value={overview.review.near_expiry}
          detail="Active cycles in the final window segment."
        />
        <StatCard
          label="Review backlog"
          value={overview.review.active_cycles}
          detail={`${overview.review.paused_cycles} paused · ${overview.review.expired} expired windows`}
        />
      </div>
    </div>
  );
}
