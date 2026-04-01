import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/server/supabase/supabase-server'
import { dodoClient } from '@/server/dodopayments/server-dodoclient'
import { UUID } from '@/lib/zod/api'
export async function POST() {
    try {
        const supabase = await createServerSupabaseClient()
        const {data: userData, error} = await supabase.auth.getUser();

        if(error || !userData.user?.email || !userData.user.id){
            return NextResponse.json({ error: 'Unauthorized Access' }, { status: 400 })
        }

        const userId = userData.user.id;
        const userEmail = userData.user.email;
        
        const dodoProductId = process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID!;
        const dodoReturnUrl = process.env.DODO_PAYMENTS_RETURN_URL!;

        if(!dodoProductId){
            return NextResponse.json({ error: 'Failed to fetch PRO plan' }, { status: 400 })
        }
        
        if(!dodoReturnUrl){
            return NextResponse.json({ error: 'Missing Vairable' }, { status: 400 })
        }


        // Fetch full name to pass to checkout if available
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('dodo_customer_id, full_name')
            .eq('user_id', userId)
            .single()

        let customerId = profile?.dodo_customer_id;

        // Create Dodo customer if not yet created
        if(!customerId){
            const customer = await dodoClient.customers.create({
                email: userEmail,
                name: profile?.full_name,
                metadata: {
                    user_id: userId
                }
            })

            customerId = customer.customer_id;

            await supabase
            .from('user_profiles')
            .update({dodo_customer_id: customerId})
            .eq('user_id', userId)
        }

        
        try {

            // Create subscription with a hosted payment link
            const subscription = await dodoClient.checkoutSessions.create({
                customer: {
                    customer_id: customerId
                },
                product_cart: [
                    {
                        product_id: dodoProductId,
                        quantity: 1
                    }
                ],
                return_url: `${dodoReturnUrl}?user_id=${userId}`
            })
            
            
            if (!subscription.checkout_url) {
                 return NextResponse.json({ error: 'Failed to generate checkout URL from payment provider' }, { status: 500 })
            }

            return NextResponse.json({ url: subscription.checkout_url })
        } catch (error: unknown) {
            console.error('checkout page creation failed:', error)
            return NextResponse.json(
                { error: 'Payment service unavailable' },
                { status: 503 }
            )
        }
    } catch (err: unknown) {
        console.error('Checkout API error:', err)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
