import Header from '@/components/Header';
import Hero from '@/components/Hero';
import StatBand from '@/components/StatBand';
import Features from '@/components/Features';
import ImageSplit from '@/components/ImageSplit';
import PlansTable from '@/components/PlansTable';
import Comparison from '@/components/Comparison';
import FAQ from '@/components/FAQ';
import GetStarted from '@/components/GetStarted';
import Footer from '@/components/Footer';

export default function HomePage() {
    return (
        <>
            <Header />
            <main>
                <Hero />
                <StatBand />
                <Features />
                <ImageSplit />
                <hr style={{height: 1, border: 0, margin: 0, background: 'linear-gradient(to right, transparent, var(--color-divider) 48px calc(100% - 48px), transparent)'}} />
                <PlansTable />
                <Comparison />
                <FAQ />
                <GetStarted />
            </main>
            <Footer />
        </>
    );
}
