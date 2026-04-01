'use client'

import { motion } from 'framer-motion'
import { FileText, Globe } from 'lucide-react'
import { siX } from 'simple-icons'
import { SimpleIcons } from '@/components/icon-wrapper'
import { ScaleCard } from '@/components/layout/scale-card'
import { Typewriter } from '@/components/homepage/typewriter'

export function OutputExamples() {
    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* Twitter Thread Preview */}
            <motion.div
                initial={{ y: 12, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
            >
                <ScaleCard bodyClassName="p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded bg-secondary">
                            <SimpleIcons path={siX.path} className="size-3 fill-foreground/60" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Twitter Thread</p>
                    </div>
                    <div className="text-sm leading-relaxed text-foreground/80 space-y-2">
                        <p>
                            <Typewriter
                                text={`Most creators make one huge mistake: they create amazing videos and let the content die on YouTube.\n\nHere's how to turn 1 video into 30 days of content 🧵`}
                                delay={600}
                            />
                        </p>
                    </div>
                </ScaleCard>
            </motion.div>

            {/* LinkedIn Post Preview */}
            <motion.div
                initial={{ y: 16, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
            >
                <ScaleCard bodyClassName="p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded bg-blue-600/8">
                            <SimpleIcons className="fill-blue-600 dark:fill-blue-400 size-3.5">
                                <path d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z" />
                                <path d="M6 9H2V21H6V9Z" />
                                <path d="M4 6C5.10457 6 6 5.10457 6 4C6 2.89543 5.10457 2 4 2C2.89543 2 2 2.89543 2 4C2 5.10457 2.89543 6 4 6Z" />
                            </SimpleIcons>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">LinkedIn Post</p>
                    </div>
                    <div className="text-sm leading-relaxed text-foreground/80 space-y-2">
                        <p>
                            <Typewriter
                                text={`Most founders believe product is everything.\n\nBut distribution decides survival.\n\nI spent 6 months building in silence. Zero traction. Then I started repurposing my videos into posts. Everything changed.`}
                                delay={1200}
                            />
                        </p>
                    </div>
                </ScaleCard>
            </motion.div>

            {/* Blog Post Preview */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
            >
                <ScaleCard bodyClassName="p-6 space-y-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-emerald-500/10">
                            <FileText className="size-4 text-emerald-500" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">Blog Summary</p>
                    </div>
                    <div className="text-sm leading-relaxed text-foreground/80 space-y-4 font-serif">
                        <p>
                            <Typewriter text="# How to Repurpose Like a Pro" delay={1800} />
                        </p>
                        <p className="text-muted-foreground text-xs">
                            <Typewriter
                                text="If you are spending hours rewriting your video transcripts, you are doing it wrong..."
                                delay={2400}
                            />
                        </p>
                    </div>
                </ScaleCard>
            </motion.div>
        </div>
    )
}
