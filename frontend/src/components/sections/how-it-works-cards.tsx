import { Layers, Link2, Zap } from "lucide-react"
import { ScaleCard } from "../layout/scale-card"
import { Reveal } from "../ui/reveal"

export function HowItWorksCards() {
    const steps = [
        {
            num: '01',
            icon: <Link2 className="size-5" />,
            title: 'Paste your YouTube link',
            description: 'Provide any YouTube video link to start. We support long-form videos of any length.',
        },
        {
            num: '02',
            icon: <Layers className="size-5" />,
            title: 'CreatorJot analyzes the video',
            description: 'Our system instantly processes the video and its transcript, identifying key hooks and arguments.',
        },
        {
            num: '03',
            icon: <Zap className="size-5 text-amber-500/70" />,
            title: 'Get ready-to-post content',
            description: 'Review and publish your new posts across Twitter, LinkedIn, and your blog in seconds.',
        },
    ]

    return (<ScaleCard className='w-fit mx-auto p-0' bodyClassName="mx-auto grid max-w-3xl gap-px md:grid-cols-3 overflow-hidden p-0">
        {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 100}>
                <div className="flex flex-col gap-4 bg-secondary p-6 md:p-8 h-full transition-colors duration-300 border border-transparent hover:border-border hover:bg-secondary/10 group cursor-default">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground/60">{step.num}</span>
                        <div className="text-foreground/70 transition-transform duration-300 group-hover:scale-110">{step.icon}</div>
                    </div>
                    <h3 className="text-base font-semibold font-suse">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
            </Reveal>
        ))}
    </ScaleCard>)
}