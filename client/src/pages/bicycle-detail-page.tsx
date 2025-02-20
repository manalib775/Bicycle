import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bicycle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Heart, Share2, Phone, ArrowLeft } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import BicycleImageCarousel from "@/components/bicycle-image-carousel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import SEO from "@/components/seo";

export default function BicycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const { data: bicycle, isLoading, error } = useQuery<Bicycle>({
    queryKey: ["/api/bicycles", parseInt(id)],
    enabled: !!id && !isNaN(parseInt(id)),
    retry: 1,
    queryFn: async () => {
      const res = await fetch(`/api/bicycles/${id}`);
      if (!res.ok) throw new Error('Failed to fetch bicycle');
      return res.json();
    }
  });

  const { data: similarBicycles } = useQuery<Bicycle[]>({
    queryKey: ["/api/bicycles"],
    enabled: !!bicycle,
  });

  const handleShare = async () => {
    if (!bicycle) return;
    try {
      await navigator.share({
        title: `${bicycle.brand} ${bicycle.model}`,
        text: `Check out this ${bicycle.brand} ${bicycle.model} on Pling!`,
        url: window.location.href,
      });
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not share this bicycle",
        variant: "destructive",
      });
    }
  };

  const handleContact = () => {
    toast({
      title: "Contact Request Sent",
      description: "The seller will be notified of your interest. They will contact you soon.",
    });
  };

  const LoadingOrError = ({ isLoading, error }: { isLoading: boolean; error: unknown }) => (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-sm mb-6 hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to listings
        </Link>
        <div className="flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
          ) : (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Error Loading Bicycle</h1>
              <p className="text-muted-foreground">Unable to load bicycle details. Please try again later.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const generateProductSchema = (bicycle: Bicycle) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${bicycle.brand} ${bicycle.model}`,
    description: bicycle.additionalDetails || `${bicycle.condition} ${bicycle.cycleType} bicycle`,
    image: bicycle.images[0],
    offers: {
      '@type': 'Offer',
      price: bicycle.price,
      priceCurrency: 'INR',
      availability: bicycle.status === 'available' ? 'InStock' : 'OutOfStock',
      condition: `https://schema.org/${bicycle.condition.replace(' ', '')}`,
    },
    brand: {
      '@type': 'Brand',
      name: bicycle.brand
    },
    productionDate: bicycle.purchaseYear.toString(),
  });

  if (isLoading || error || !bicycle) {
    return <LoadingOrError isLoading={isLoading} error={error} />;
  }

  const filteredSimilarBicycles = similarBicycles?.filter(b => 
    b.id !== bicycle.id && 
    b.category === bicycle.category
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${bicycle.brand} ${bicycle.model} - ${bicycle.condition} ${bicycle.cycleType} Bicycle | Pling`}
        description={`${bicycle.condition} ${bicycle.cycleType} bicycle. ${bicycle.brand} ${bicycle.model}, ${bicycle.purchaseYear}. ${bicycle.additionalDetails || ''}`}
        canonicalUrl={`/bicycles/${bicycle.id}`}
        imageUrl={bicycle.images[0]}
        type="product"
        schema={generateProductSchema(bicycle)}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        <Link href="/" className="inline-flex items-center text-sm mb-6 hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to listings
        </Link>

        {bicycle ? (
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Left Column - Images */}
            <div>
              <BicycleImageCarousel images={bicycle.images} thumbnailSize={false} />
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {bicycle.brand} {bicycle.model}
                    </h1>
                    <p className="text-xl md:text-2xl font-semibold mt-2">
                      ₹{bicycle.price?.toLocaleString() ?? 'Price not available'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleShare}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (isInWishlist(bicycle.id)) {
                          removeFromWishlist(bicycle.id);
                        } else {
                          addToWishlist(bicycle.id);
                        }
                      }}
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          isInWishlist(bicycle.id) ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{bicycle.category}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{bicycle.purchaseYear}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Transmission</p>
                  <p className="font-medium">{bicycle.gearTransmission}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Frame</p>
                  <p className="font-medium">{bicycle.frameMaterial}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Suspension</p>
                  <p className="font-medium">{bicycle.suspension}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Condition</p>
                  <Badge variant={
                    bicycle.condition === "Like New" ? "default" :
                    bicycle.condition === "Good" ? "secondary" :
                    "outline"
                  }>
                    {bicycle.condition}
                  </Badge>
                </div>
              </div>

              {bicycle.additionalDetails && (
                <Card className="p-4">
                  <h2 className="font-semibold mb-2">Additional Details</h2>
                  <p className="text-sm text-muted-foreground">{bicycle.additionalDetails}</p>
                </Card>
              )}

              <Button 
                size="lg"
                className="w-full"
                onClick={handleContact}
              >
                <Phone className="mr-2 h-5 w-5" />
                Contact Seller
              </Button>
            </div>
          </div>
        ) : (
          <LoadingOrError isLoading={isLoading} error={error} />
        )}

        {/* Similar Bicycles */}
        {filteredSimilarBicycles && filteredSimilarBicycles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Similar Bicycles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredSimilarBicycles.map(similarBicycle => (
                <Link 
                  key={similarBicycle.id} 
                  href={`/bicycles/${similarBicycle.id}`}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="p-4">
                      <BicycleImageCarousel images={similarBicycle.images} />
                      <h3 className="mt-4 font-semibold">
                        {similarBicycle.brand} {similarBicycle.model}
                      </h3>
                      <p className="text-lg font-semibold mt-2">
                        ₹{similarBicycle.price.toLocaleString()}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}