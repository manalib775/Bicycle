import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bicycle } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  UserCircle,
  Bike,
  Heart,
  Map,
  Star,
  Clock,
  MessageCircle,
  Store,
  Upload,
  Camera,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import Navbar from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const PROFICIENCY_LEVELS = [
  { 
    value: "occasional", 
    label: "Occasional Rider",
    description: "You ride a bicycle occasionally for leisure or short trips"
  },
  { 
    value: "regular", 
    label: "Regular Rider",
    description: "You ride frequently and are comfortable with most terrains"
  },
  { 
    value: "professional", 
    label: "Professional Rider",
    description: "You're an expert cyclist with advanced skills and experience"
  },
];

export default function ProfilePage(): JSX.Element | null {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { wishlist } = useWishlist();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
      toast({
        title: "Authentication Required",
        description: "Please log in to view your profile",
        variant: "destructive",
      });
    }
  }, [user, authLoading, setLocation, toast]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const { data: wishlistBicycles, isLoading: isLoadingWishlist } = useQuery<Bicycle[]>({
    queryKey: ["/api/bicycles", { ids: Array.from(wishlist) }],
    enabled: wishlist.size > 0,
    queryFn: async () => {
      const ids = Array.from(wishlist).join(",");
      const res = await fetch(`/api/bicycles?ids=${ids}`);
      if (!res.ok) throw new Error("Failed to fetch wishlist");
      return res.json();
    },
  });

  const { data: userListings, isLoading: isLoadingListings } = useQuery<Bicycle[]>({
    queryKey: ["/api/bicycles", { sellerId: user?.id }],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch(`/api/bicycles?sellerId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  const updateBicycleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/bicycles/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Bicycle status has been updated successfully.",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      cyclingProficiency?: string;
      currentPassword?: string;
      newPassword?: string;
    }) => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
    },
  });

  const updateProfileImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/user/profile-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to update profile image");
      const data = await res.json();
      return data.imageUrl;
    },
    onSuccess: (imageUrl) => {
      setProfileImage(imageUrl);
      toast({
        title: "Profile Image Updated",
        description: "Your profile image has been updated successfully.",
      });
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("image", file);
      updateProfileImageMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Profile Sidebar */}
          <aside className="w-full lg:w-80">
            <div className="sticky top-24 space-y-6">
              {/* Profile Card */}
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Profile Image */}
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-muted">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircle className="w-full h-full text-muted-foreground p-4" />
                        )}
                      </div>
                      <label
                        htmlFor="profile-image"
                        className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 shadow-lg"
                      >
                        <Camera className="h-4 w-4" />
                        <input
                          type="file"
                          id="profile-image"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>

                    {/* Profile Info */}
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">
                        {user.firstName} {user.lastName}
                      </h2>
                      <Badge variant={user.type === "institutional" ? "default" : "secondary"}>
                        {user.type === "institutional" ? "Business Seller" : "Individual Seller"}
                      </Badge>
                      {user.cyclingProficiency && (
                        <Badge variant="outline" className="mt-2">
                          {PROFICIENCY_LEVELS.find(level => level.value === user.cyclingProficiency)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Tabs */}
              <Tabs defaultValue="listings" orientation="vertical" className="w-full">
                <TabsList className="w-full flex flex-col space-y-2">
                  {user.type === "institutional" && (
                    <TabsTrigger value="business" className="w-full justify-start gap-2 h-10">
                      <Store className="h-4 w-4" />
                      Business Profile
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="listings" className="w-full justify-start gap-2 h-10">
                    <Bike className="h-4 w-4" />
                    My Listings
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="w-full justify-start gap-2 h-10">
                    <UserCircle className="h-4 w-4" />
                    Personal Info
                  </TabsTrigger>
                  <TabsTrigger value="wishlist" className="w-full justify-start gap-2 h-10">
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </TabsTrigger>
                </TabsList>
                <div className="flex-1">
                  <TabsContent value="business">
                    {user.type === "institutional" && (
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Business Profile</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Shop Images */}
                            <div>
                              <Label>Shop Images</Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                                <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                                  <Upload className="h-8 w-8 text-muted-foreground" />
                                </div>
                              </div>
                            </div>

                            {/* Business Information */}
                            <div className="grid gap-6">
                              <div>
                                <Label>Business Name</Label>
                                <Input 
                                  defaultValue={user.businessName || ''} 
                                  placeholder="Enter business name"
                                  className="mt-1.5"
                                />
                              </div>
                              <div>
                                <Label>Business Description</Label>
                                <Textarea 
                                  defaultValue={user.businessDescription || ''} 
                                  placeholder="Tell customers about your business..."
                                  className="mt-1.5"
                                  rows={4}
                                />
                              </div>
                              <div>
                                <Label>Business Phone</Label>
                                <Input 
                                  defaultValue={user.businessPhone || ''} 
                                  placeholder="Enter business phone"
                                  className="mt-1.5"
                                />
                              </div>
                              <div>
                                <Label>Business Address</Label>
                                <Textarea 
                                  defaultValue={user.businessAddress || ''} 
                                  placeholder="Enter business address"
                                  className="mt-1.5"
                                />
                              </div>
                            </div>

                            {/* Business Hours */}
                            <div>
                              <Label>Business Hours</Label>
                              <div className="mt-1.5 grid gap-4">
                                {/* Add business hours component here */}
                              </div>
                            </div>

                            {/* Customer Ratings */}
                            <div>
                              <h3 className="font-semibold text-lg mb-4">Customer Ratings</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card>
                                  <CardContent className="pt-6">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold">4.8</div>
                                      <p className="text-sm text-muted-foreground">Overall Rating</p>
                                    </div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="pt-6">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold">127</div>
                                      <p className="text-sm text-muted-foreground">Total Reviews</p>
                                    </div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="pt-6">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold">98%</div>
                                      <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="listings">
                    {isLoadingListings ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : !userListings?.length ? (
                      <Card>
                        <CardContent className="text-center py-12">
                          <Bike className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            You haven't listed any bicycles yet.
                          </p>
                          <Button className="mt-4" asChild>
                            <a href="/sell">List a Bicycle</a>
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {userListings.map((bicycle) => (
                          <Card key={bicycle.id} className="overflow-hidden">
                            <CardContent className="p-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <img
                                  src={bicycle.images[0]}
                                  alt={`${bicycle.brand} ${bicycle.model}`}
                                  className="w-full sm:w-24 h-24 object-cover rounded-md"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-xl font-semibold truncate">
                                    {bicycle.brand} {bicycle.model}
                                  </h3>
                                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      Listed {format(new Date(bicycle.createdAt || Date.now()), 'MMM d, yyyy')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageCircle className="h-4 w-4" />
                                      {bicycle.inquiries || 0} Inquiries
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4" />
                                      {bicycle.views || 0} Views
                                    </div>
                                  </div>
                                </div>
                                <Select
                                  value={bicycle.status || "available"}
                                  onValueChange={(value) =>
                                    updateBicycleStatusMutation.mutate({
                                      id: bicycle.id,
                                      status: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="sold">Sold</SelectItem>
                                    <SelectItem value="reserved">Reserved</SelectItem>
                                    <SelectItem value="unlisted">Unlisted</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <Separator className="my-4" />

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Price</span>
                                  <p className="font-medium">₹{bicycle.price.toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Condition</span>
                                  <p className="font-medium">{bicycle.condition}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Category</span>
                                  <p className="font-medium">{bicycle.category}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Frame</span>
                                  <p className="font-medium">{bicycle.frameMaterial}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="profile">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label>Username</Label>
                                <Input value={user.username} disabled className="mt-1.5" />
                              </div>
                              <div>
                                <Label>Email</Label>
                                <Input value={user.email} disabled className="mt-1.5" />
                              </div>
                              <div>
                                <Label>First Name</Label>
                                <Input value={user.firstName} className="mt-1.5" />
                              </div>
                              <div>
                                <Label>Last Name</Label>
                                <Input value={user.lastName} className="mt-1.5" />
                              </div>
                              <div>
                                <Label>City</Label>
                                <Input value={user.city} className="mt-1.5" />
                              </div>
                              <div>
                                <Label>Mobile</Label>
                                <Input value={user.mobile} className="mt-1.5" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Change Password</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Current Password</Label>
                            <Input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label>New Password</Label>
                            <Input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="mt-1.5"
                            />
                          </div>
                          <Button
                            onClick={() =>
                              updateProfileMutation.mutate({
                                currentPassword,
                                newPassword,
                              })
                            }
                            disabled={!currentPassword || !newPassword}
                          >
                            Change Password
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Cycling Proficiency</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {PROFICIENCY_LEVELS.map((level) => (
                              <div
                                key={level.value}
                                className={cn(
                                  "relative flex items-center space-x-4 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors",
                                  user.cyclingProficiency === level.value && "border-primary"
                                )}
                                onClick={() =>
                                  updateProfileMutation.mutate({ cyclingProficiency: level.value })
                                }
                              >
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold">{level.label}</h3>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {level.description}
                                  </p>
                                </div>
                                {user.cyclingProficiency === level.value && (
                                  <Badge>Selected</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="wishlist">
                    {isLoadingWishlist ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : !wishlistBicycles?.length ? (
                      <Card>
                        <CardContent className="text-center py-12">
                          <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Your wishlist is empty. Browse bicycles and add them to your wishlist!
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {wishlistBicycles.map((bicycle) => (
                          <Card key={bicycle.id} className="overflow-hidden">
                            <CardContent className="p-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <img
                                  src={bicycle.images[0]}
                                  alt={`${bicycle.brand} ${bicycle.model}`}
                                  className="w-full sm:w-24 h-24 object-cover rounded-md"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-xl font-semibold truncate">
                                    {bicycle.brand} {bicycle.model}
                                  </h3>
                                  <p className="text-muted-foreground mt-1">₹{bicycle.price.toLocaleString()}</p>
                                </div>
                                <Badge
                                  variant={bicycle.status === "available" ? "default" : "secondary"}
                                >
                                  {bicycle.status === "available" ? "Available" : "Sold"}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
          </div>
        </div>
      </main>
    </div>
  );
}