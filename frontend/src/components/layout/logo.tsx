import Image from 'next/image'

const LogoIcon = ({ className }: { className?: string; }) => {
    return (
        <span className='transition-all dark:bg-white rounded-md'>
            <Image
                src="/assets/branding/SVG_logo-transcript.svg"
                alt="CreatorJot Logo"
                className={`size-7 md:size-8 transition-transform dark:scale-75 ${className}`}
                width={24}
                height={24}
            />
        </span>
    )
}

const LogoText = ({ children, className }: { children?: Readonly<React.ReactNode>; className?: string; }) => {
    return (
        <span className={`text-xl font-medium tracking-wide font-suse ${className}`}>
            {children ?? 'creatorJot'}
        </span>
    )
}

export {
    LogoText,
    LogoIcon
}