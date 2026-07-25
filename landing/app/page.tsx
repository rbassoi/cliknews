import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SocialProof from '@/components/SocialProof';
import Features from '@/components/Features';
import PlansTable from '@/components/PlansTable';
import Comparison from '@/components/Comparison';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';

export default function HomePage() {
    return (
        <>
            <Header />
            <main>
                <Hero />
                <SocialProof />
                <Features />
                <PlansTable />
                <Comparison />
                <FAQ />
            </main>
            <Footer />
        </>
    );
}
