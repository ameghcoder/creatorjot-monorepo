import AuthCard from '@/components/auth/auth-card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Sign Up | CreatorJot',
    description: 'Create your free CreatorJot account and start turning YouTube videos into social media posts.',
    robots: { index: false, follow: false },
}

export default function SignupPage() {
    return <AuthCard mode="signup" />
}
