
import { ScaleCard } from "@/components/layout/scale-card";
import { Reveal } from "../ui/reveal";

const faqs = [
    {
        q: "Does this work with Shorts or TikToks?",
        a: "Currently, CreatorJot is optimized for long-form YouTube videos (5+ minutes) to extract the most value and depth for your generated posts."
    },
    {
        q: "Will the posts sound like an AI robot?",
        a: "No. We specifically analyze your transcript to match your tone, vocabulary, and sentence structure. It sounds like you, just formatted for the platform."
    },
    {
        q: "Can I edit the generated content?",
        a: "Absolutely. We provide high-quality drafts, but you always have the final say. You can tweak, regenerate, or publish directly."
    },
    {
        q: "What social platforms do you support?",
        a: "We currently generate content optimized for Twitter (threads and single tweets), LinkedIn posts, and Blog outlines/summaries."
    }
];

export function FaqCards() {
    return (<div className="mx-auto max-w-3xl space-y-6 md:space-y-8">
        {faqs.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 100}>
                <ScaleCard bodyClassName="p-6 md:p-8 space-y-3">
                    <h3 className="text-lg font-semibold">{faq.q}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </ScaleCard>
            </Reveal>
        ))}
    </div>)
}

export function FaqSection() {
    return (
        <section className="px-6 py-24 md:py-32 border-t border-border">
            <Reveal>
                <div className="mb-14 text-center space-y-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">FAQ</p>
                    <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                        Common Questions
                    </h2>
                </div>
            </Reveal>

            <FaqCards />
        </section>
    );
}
