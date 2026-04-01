import AuthCard from '@/components/auth/auth-card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Log In | CreatorJot',
    description: 'Sign in to your CreatorJot account to generate social media posts from your YouTube videos.',
    robots: { index: false, follow: false },
}

export default function LoginPage() {
    return <AuthCard mode="login" />
}
