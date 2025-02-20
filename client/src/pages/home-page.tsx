import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bicycle } from "@shared/schema";
import Navbar from "@/components/navbar";
import BicycleGrid from "@/components/bicycle-grid";
import LocationDialog from "@/components/location-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const BANNER_IMAGES = [
  {
    url: "/images/banner-perfect-ride.jpg",
    title: "Find Your Perfect Ride",
    subtitle: "Explore our curated collection of premium bicycles",
    width: 1920,
    height: 500
  },
  {
    url: "/images/banner-quality.jpg",
    title: "Quality Assured",
    subtitle: "Every bicycle is verified by our experts",
    width: 1920,
    height: 500
  },
  {
    url: "/images/banner-sell.jpg",
    title: "Sell With Confidence",
    subtitle: "Join our trusted community of sellers",
    width: 1920,
    height: 500
  }
];

export default function HomePage() {
  const [showLocationDialog, setShowLocationDialog] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const nextBanner = (currentBanner + 1) % BANNER_IMAGES.length;

  const { data: bicycles, isLoading } = useQuery<Bicycle[]>({
    queryKey: ["/api/bicycles", selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation) params.append("city", selectedLocation);
      const res = await fetch(`/api/bicycles?${params}`);
      return res.json();
    },
  });

  // Auto-rotate banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((current) =>
        current === BANNER_IMAGES.length - 1 ? 0 : current + 1
      );
    }, 5000); // Change every 5 seconds

    return () => clearInterval(timer);
  }, []);

  // Preload next banner image
  useEffect(() => {
    const img = new Image();
    img.src = BANNER_IMAGES[nextBanner].url;
  }, [currentBanner, nextBanner]);

  return (
    <div className="min-h-screen bg-background">
      <header>
        <Navbar />
      </header>

      {/* Hero Section with Moving Banner */}
      <section 
        className="relative h-[500px] overflow-hidden"
        aria-label="Featured bicycle collections"
      >
        {BANNER_IMAGES.map((banner, index) => (
          <div
            key={index}
            role="img"
            aria-label={banner.title}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              currentBanner === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <img 
              src={banner.url}
              alt={banner.title}
              width={banner.width}
              height={banner.height}
              loading={index === 0 ? "eager" : "lazy"}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: 0.7,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30" />
            <div className="container mx-auto px-4 h-full flex flex-col justify-center text-white relative z-10">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                {banner.title}
              </h1>
              <p className="text-lg md:text-xl mb-8">{banner.subtitle}</p>
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  variant="default"
                  aria-label="Browse available bicycles"
                >
                  Browse Bicycles
                </Button>
                <Button 
                  size="lg" 
                  variant="secondary"
                  aria-label="List your bicycle for sale"
                >
                  Sell Your Bicycle
                </Button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Location Badge */}
      {selectedLocation && (
        <div className="bg-muted py-2" role="region" aria-label="Current location">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Location:</span>
              <span className="text-sm font-medium">{selectedLocation}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLocationDialog(true)}
              aria-label="Change location"
            >
              Change
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12" aria-labelledby="featured-bicycles">
          <h2 id="featured-bicycles" className="text-2xl font-bold mb-6">Featured Bicycles</h2>
          {isLoading ? (
            <div className="flex justify-center py-12" role="status" aria-label="Loading bicycles">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="sr-only">Loading bicycles...</span>
            </div>
          ) : (
            <BicycleGrid bicycles={bicycles || []} />
          )}
        </section>

        {/* Features Section */}
        <section className="mb-12 py-12 bg-muted rounded-lg" aria-labelledby="why-choose">
          <div className="container mx-auto px-4">
            <h2 id="why-choose" className="text-2xl font-bold mb-8 text-center">
              Why Choose Pling?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <article>
                <h3 className="font-semibold mb-2">Verified Sellers</h3>
                <p className="text-muted-foreground">
                  Every seller is verified to ensure a safe buying experience
                </p>
              </article>
              <article>
                <h3 className="font-semibold mb-2">Quality Assurance</h3>
                <p className="text-muted-foreground">
                  Each bicycle undergoes a thorough quality check
                </p>
              </article>
              <article>
                <h3 className="font-semibold mb-2">Secure Transactions</h3>
                <p className="text-muted-foreground">
                  Safe and secure payment options for peace of mind
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-12" role="contentinfo">
        <div className="container mx-auto px-4">
          <nav className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">About</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/about" className="hover:text-primary">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="/how-it-works" className="hover:text-primary">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/faq" className="hover:text-primary">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-primary">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </footer>

      {/* Location Dialog */}
      <LocationDialog
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        onLocationSelect={(location) => {
          setSelectedLocation(location);
          setShowLocationDialog(false);
        }}
      />
    </div>
  );
}