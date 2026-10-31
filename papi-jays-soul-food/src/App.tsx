import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { MenuSection } from './components/MenuSection'
import { FridayFeature } from './components/FridayFeature'
import { BrandMoment } from './components/BrandMoment'
import { Visit } from './components/Visit'
import { Footer } from './components/Footer'
import { MobileMenuBar } from './components/MobileMenuBar'
import { DraftNotice } from './components/DraftNotice'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <MenuSection />
        <FridayFeature />
        <BrandMoment />
        <Visit />
      </main>
      <Footer />
      <MobileMenuBar />
      <DraftNotice />
    </>
  )
}
