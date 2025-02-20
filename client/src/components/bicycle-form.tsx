import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBicycleSchema, type InsertBicycle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import cn from 'classnames';

const BRANDS = [
  "Trek", "Giant", "Specialized", "Cannondale", "Scott",
  "Merida", "BMC", "Bianchi", "Other"
];

const YEARS = Array.from(
  { length: new Date().getFullYear() - 1999 },
  (_, i) => (new Date().getFullYear() - i).toString()
);

export default function BicycleForm() {
  const { toast } = useToast();
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<InsertBicycle>({
    resolver: zodResolver(insertBicycleSchema),
    defaultValues: {
      category: "Adult",
      brand: "",
      model: "",
      purchaseYear: new Date().getFullYear(),
      price: 0,
      gearTransmission: "Non-Geared",
      frameMaterial: "Steel",
      suspension: "None",
      condition: "Good",
      cycleType: "Hybrid",
      wheelSize: "26",
      hasReceipt: false,
      additionalDetails: "",
      images: []
    }
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertBicycle) => {
      try {
        setIsUploading(true);
        toast({
          title: "Uploading Images",
          description: "Please wait while we upload your images...",
        });

        // Handle image upload first
        const imageUrls = await Promise.all(
          imageFiles.map(async (file, index) => {
            const formData = new FormData();
            formData.append('image', file);

            try {
              const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
              });

              if (!res.ok) {
                throw new Error(`Failed to upload image ${index + 1}`);
              }

              const imageUrl = await res.text();
              toast({
                title: "Image Upload Success",
                description: `Image ${index + 1} uploaded successfully`,
              });

              return imageUrl;
            } catch (error) {
              console.error(`Error uploading image ${index + 1}:`, error);
              toast({
                title: "Image Upload Failed",
                description: `Failed to upload image ${index + 1}. Please try again.`,
                variant: "destructive",
              });
              throw error;
            }
          })
        );

        const finalData = {
          ...data,
          images: imageUrls
        };

        // Create bicycle listing
        const res = await apiRequest({
          method: "POST",
          url: "/api/bicycles",
          data: finalData
        });

        if (!res.ok) {
          throw new Error('Failed to create listing');
        }

        return res.json();
      } catch (error) {
        console.error('Error in mutationFn:', error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bicycles"] });
      toast({
        title: "Success",
        description: "Your bicycle has been listed successfully!",
      });
      form.reset();
      setImageFiles([]);
      setPreviewUrls([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  const validateImage = (file: File) => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload only image files",
        variant: "destructive",
      });
      return false;
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleImageFiles = (files: File[]) => {
    if (files.length + imageFiles.length > 5) {
      toast({
        title: "Too Many Images",
        description: "Maximum 5 images allowed",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(file => validateImage(file));
    setImageFiles(prev => [...prev, ...validFiles]);

    // Generate preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const watchCategory = form.watch("category");
  const watchBrand = form.watch("brand");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-6">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Adult">Adult</SelectItem>
                  <SelectItem value="Kids">Kids</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setShowCustomBrand(value === "Other");
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showCustomBrand && (
                <Input
                  placeholder="Enter brand name"
                  onChange={(e) => field.onChange(e.target.value)}
                  className="mt-2"
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purchaseYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year of Purchase</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Like New">Like New</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload Section */}
        <div className="space-y-4">
          <FormLabel>Images (Upload up to 5 images)</FormLabel>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!isUploading) {
                const files = Array.from(e.dataTransfer.files);
                handleImageFiles(files);
              }
            }}
            onClick={() => {
              if (!isUploading) {
                document.getElementById('image-input')?.click();
              }
            }}
          >
            <input
              id="image-input"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleImageFiles(Array.from(e.target.files));
                }
              }}
              disabled={isUploading}
            />
            <p>{isUploading ? "Uploading images..." : "Drag and drop images here or click to select"}</p>
          </div>

          {/* Image Previews */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    onClick={() => {
                      if (!isUploading) {
                        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                        setImageFiles(prev => prev.filter((_, i) => i !== index));
                      }
                    }}
                    disabled={isUploading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isPending || isUploading || imageFiles.length === 0}
          className="w-full"
        >
          {isPending || isUploading ? "Saving..." : "List Bicycle"}
        </Button>
      </form>
    </Form>
  );
}