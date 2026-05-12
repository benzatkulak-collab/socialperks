const FAQS: { q: string; a: string }[] = [
  {
    q: "Is it really free for 14 days?",
    a: "Yes. Full feature access. No watermarks, no limits, no surprises.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. We don't ask for payment info until you choose to upgrade.",
  },
  {
    q: "What happens after the trial?",
    a: "Your account pauses. Your data stays. You can upgrade anytime to restore access.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. One click in settings. Pro-rated refunds on annual plans.",
  },
  {
    q: "Is there a long-term contract?",
    a: "No. Month-to-month. Cancel anytime.",
  },
  {
    q: "Do you offer discounts for nonprofits?",
    a: "Yes, 50% off all plans. Email hi@socialperks.app with proof of 501(c)(3).",
  },
  {
    q: "Do you have an annual discount?",
    a: "Yes, 20% off when paid yearly.",
  },
  {
    q: "Can multiple team members use one account?",
    a: "Up to 3 seats on Growth plan, unlimited on Enterprise.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit/debit cards, Apple Pay, Google Pay via Stripe.",
  },
  {
    q: "Will my price ever go up?",
    a: "We grandfather existing customers at their current rate. Future price changes only apply to new customers.",
  },
  {
    q: "What if I have more than one business?",
    a: "Each business gets its own account. Multi-location enterprises can use a single Enterprise account.",
  },
  {
    q: "How do I get support?",
    a: "Email support included on all plans. Priority support on Growth, dedicated AM on Enterprise.",
  },
];

export function PricingFaq() {
  return (
    <section className="bg-gray-950 py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="font-heading italic text-4xl md:text-5xl text-gray-100 mb-10 text-center">
          Pricing FAQ
        </h2>
        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <details
              key={i}
              className="group rounded-lg border border-gray-800 bg-gray-900/50 px-5 py-4 open:bg-gray-900 transition"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none text-gray-100 font-medium">
                <span>{item.q}</span>
                <span className="ml-4 text-gray-500 transition-transform group-open:rotate-45 text-xl leading-none select-none">
                  +
                </span>
              </summary>
              <p className="mt-3 text-gray-400 text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
