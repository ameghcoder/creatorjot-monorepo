import Footer from '@/components/layout/footer'
import Header from '@/components/layout/header'
import Scales from '@/components/ui/scale'
import React from 'react'


const layout = ({ children }: Readonly<{
    children: React.ReactNode
}>) => {
    const scaleSize = 5
    const borderWidth = 16
    const halfBorder = borderWidth / 2 + 8;
    return (
        <>
            <div className="z-0 fixed top-0 left-0 w-full h-full">
                <div className="bg-texture w-full h-full"></div>
            </div>
            <div className="z-10 max-w-7xl mx-auto border-border bg-background relative">
                <Header />
                <div className='hidden xl:block'>
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            top: `0%`,
                            bottom: `0%`,
                            left: -halfBorder,
                            width: borderWidth,
                            height: `${100}%`,
                        }}
                    >
                        <Scales size={scaleSize} />
                    </div>

                    {/* Right strip */}
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            top: `0%`,
                            bottom: `0%`,
                            right: -halfBorder,
                            width: borderWidth,
                            height: `${100}%`,
                        }}
                    >
                        <Scales size={scaleSize} />
                    </div>
                </div>

                {children}
                <Footer />
            </div>
        </>
    )
}

export default layout