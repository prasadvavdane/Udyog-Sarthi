"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DELIGHTS_KITCHEN_ACCOUNT = {
  tenantId: "delights-kitchen",
  email: "admin@delightskitchen.in",
  password: "Admin@123",
};

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fillDelightsKitchenCredentials = () => {
    setTenantId(DELIGHTS_KITCHEN_ACCOUNT.tenantId);
    setEmail(DELIGHTS_KITCHEN_ACCOUNT.email);
    setPassword(DELIGHTS_KITCHEN_ACCOUNT.password);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantId,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Sign-in failed. Check the credentials and the deployment database connection.");
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while signing in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Delights Kitchen</CardTitle>
          <CardDescription>Sign in to your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button type="button" variant="outline" className="w-full" onClick={fillDelightsKitchenCredentials}>
            Use Delights Kitchen credentials
          </Button>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant code</Label>
              <Input id="tenantId" value={tenantId} onChange={(event) => setTenantId(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <Button type="submit" className="w-full justify-between" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
