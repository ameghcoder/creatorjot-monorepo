"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
    undefined
);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = ({
    children,
    open: openProp,
    setOpen: setOpenProp,
    animate = true,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    const [openState, setOpenState] = useState(true);

    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const Sidebar = ({
    children,
    open,
    setOpen,
    animate,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    return (
        <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
            {children}
        </SidebarProvider>
    );
};

interface SidebarBodyProps extends Omit<React.ComponentProps<typeof motion.div>, "children"> {
    children?: React.ReactNode;
}

export const SidebarBody = (props: SidebarBodyProps) => {
    return (
        <>
            <DesktopSidebar {...props} />
            <MobileSidebar {...(props as React.ComponentProps<"div">)} />
        </>
    );
};

export const DesktopSidebar = ({
    className,
    children,
    ...props
}: SidebarBodyProps) => {
    const { open, animate } = useSidebar();
    return (
        <>
            <motion.div
                className={cn(
                    "h-dvh px-3 py-4 hidden md:flex md:flex-col bg-card border-r border-border w-[224px] shrink-0 relative transition-transform",
                    className
                )}
                animate={{
                    width: animate ? (open ? "224px" : "64px") : "224px",
                }}
                {...props}
            >
                {children}
            </motion.div>
        </>
    );
};

export const MobileSidebar = ({
    className,
    children,
}: React.ComponentProps<"div">) => {
    const { open, setOpen } = useSidebar();
    return (
        <div >
            {/* Drawer + backdrop */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop — clicking closes the drawer */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-99 bg-black/40 md:hidden"
                            onClick={() => setOpen(false)}
                        />

                        {/* Drawer panel — 3/5 width, slides in from left */}
                        <motion.div
                            key="drawer"
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className={cn(
                                "fixed top-0 left-0 h-full w-3/5 max-w-xs bg-card border-r border-border z-100 flex flex-col p-6 md:hidden",
                                className
                            )}
                            /* Stop clicks inside the drawer from hitting the backdrop */
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <div
                                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                <X className="size-5" />
                            </div>
                            {children}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export const SidebarLink = ({
    link,
    className,
    ...props
}: {
    link: Links;
    className?: string;
}) => {
    const { open, animate } = useSidebar();
    return (
        <a
            href={link.href}
            className={cn(
                "flex items-center justify-start gap-4 group/nav py-2 rounded-lg transition-all duration-200",
                "text-muted-foreground hover:bg-foreground/4 hover:text-foreground",
                open ? "px-0" : "px-2",
                className
            )}
            {...props}
        >
            <div className="shrink-0 flex items-center justify-center">
                {link.icon}
            </div>

            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="text-[13px] font-medium transition duration-150 whitespace-pre inline-block p-0! m-0!"
            >
                {link.label}
            </motion.span>
        </a>
    );
};
