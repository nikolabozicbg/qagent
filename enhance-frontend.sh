#!/bin/bash

cd "$(dirname "$0")/apps/frontend" || exit 1

echo "🚀 Enhancing QAgent Next.js Frontend..."
echo "📍 Working directory: $(pwd)"

###########################################################################
# 1. INSTALL DEPENDENCIES
###########################################################################

echo "📦 Installing dependencies..."
npm install axios
npm install -D tailwindcss postcss autoprefixer

###########################################################################
# 2. TAILWIND CONFIG
###########################################################################

echo "📦 Configuring Tailwind..."

cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
EOF

cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

###########################################################################
# 3. SHADCN/UI SETUP
###########################################################################

echo "📦 Setting up shadcn/ui..."

mkdir -p src/components/ui
mkdir -p src/lib

cat > components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
EOF

cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

npm install clsx tailwind-merge class-variance-authority lucide-react

# Install shadcn components
npx shadcn@latest add button card input textarea tabs toast -y

###########################################################################
# 4. UPDATE GLOBALS.CSS
###########################################################################

cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-gray-50 text-foreground;
  }
}
EOF

###########################################################################
# 5. UPDATE TSCONFIG FOR PATH ALIASES
###########################################################################

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

###########################################################################
# 6. BRAND KIT + LOGO
###########################################################################

mkdir -p brand
mkdir -p public

cat > brand/colors.md << 'EOF'
# QAgent Brand Colors

Primary:
- Blue: #2563EB
- Indigo: #4338CA

Secondary:
- Gray: #6B7280
- Dark: #111827
- Light: #F3F4F6

Accent:
- Electric Mint: #4FF1C0
- AI Purple: #7C3AED
EOF

cat > brand/typography.md << 'EOF'
# QAgent Typography

Primary UI Font: Inter  
Headlines: Satoshi or Poppins  
Code Blocks: JetBrains Mono
EOF

cat > public/logo.svg << 'EOF'
<svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="110" cy="110" r="80" stroke="#2563EB" stroke-width="18"/>
<circle cx="110" cy="110" r="40" fill="#2563EB"/>
<path d="M150 150 L190 190" stroke="#7C3AED" stroke-width="18" stroke-linecap="round"/>
</svg>
EOF

cat > public/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">
<circle cx="110" cy="110" r="80" stroke="#2563EB" stroke-width="20" fill="none"/>
<circle cx="110" cy="110" r="38" fill="#2563EB"/>
</svg>
EOF

###########################################################################
# 7. UPDATE LAYOUT WITH PROVIDERS
###########################################################################

cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'QAgent - AI Test Generation',
  description: 'Autonomous AI Agent for QA - Generate test suites in seconds',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
EOF

###########################################################################
# 8. LANDING PAGE
###########################################################################

cat > src/app/page.tsx << 'EOF'
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <Image src="/logo.svg" alt="QAgent Logo" width={112} height={112} className="mb-6" />
      <h1 className="text-6xl font-bold mb-3">QAgent</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl">
        Autonomous AI Agent for QA — Generate comprehensive test suites in seconds.
      </p>

      <Link href="/upload">
        <Button size="lg" className="text-lg px-8">
          Generate Tests
        </Button>
      </Link>
    </main>
  );
}
EOF

###########################################################################
# 9. UPLOAD PAGE
###########################################################################

mkdir -p src/app/upload

cat > src/app/upload/page.tsx << 'EOF'
import UploadBox from "@/components/UploadBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto mt-20 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold">Upload Specification</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadBox />
        </CardContent>
      </Card>
    </div>
  );
}
EOF

###########################################################################
# 10. RESULT PAGE
###########################################################################

mkdir -p src/app/result

cat > src/app/result/page.tsx << 'EOF'
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useEffect, useState } from "react";

export default function ResultPage({ searchParams }: any) {
  const { id } = searchParams;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/result/${id}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-20 text-xl text-center">Generating tests...</div>;
  if (error) return <div className="p-20 text-xl text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-20 text-xl text-center">No data found</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Generated Test Suite</h1>

      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="testcases">Test Cases</TabsTrigger>
          <TabsTrigger value="gherkin">Gherkin</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios">
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
            {data.scenarios || "No scenarios generated"}
          </pre>
        </TabsContent>

        <TabsContent value="testcases">
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
            {data.test_cases || "No test cases generated"}
          </pre>
        </TabsContent>

        <TabsContent value="gherkin">
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
            {data.gherkin || "No Gherkin scenarios generated"}
          </pre>
        </TabsContent>

        <TabsContent value="automation">
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
            {data.automation || "No automation code generated"}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}
EOF

###########################################################################
# 11. UPLOAD COMPONENT
###########################################################################

mkdir -p src/components

cat > src/components/UploadBox.tsx << 'EOF'
"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

export default function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const upload = async () => {
    if (!file) {
      toast({ 
        title: "No file selected", 
        description: "Please choose a PDF, DOCX, or TXT file",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    
    try {
      toast({ title: "Uploading...", description: "Extracting content..." });

      const form = new FormData();
      form.append("file", file);

      const uploadRes = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
        form
      );

      const text = uploadRes.data.text;

      toast({ title: "Generating tests...", description: "This may take a moment..." });

      const genRes = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/generate`,
        { text, filename: file.name }
      );

      toast({ title: "Done!", description: "Your test suite is ready." });

      router.push(`/result?id=${genRes.data.id}`);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message,
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center space-y-4">
      <Input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="max-w-md"
      />
      
      {file && (
        <p className="text-sm text-gray-600">
          Selected: {file.name}
        </p>
      )}
      
      <Button onClick={upload} disabled={loading} size="lg">
        {loading ? "Generating..." : "Generate Test Suite"}
      </Button>
    </div>
  );
}
EOF

###########################################################################
# 12. ENV FILES
###########################################################################

cat > .env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
EOF

cat > .env.example << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
EOF

###########################################################################
# 13. UPDATE NEXT CONFIG
###########################################################################

cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@qagent/ui'],
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
}

module.exports = nextConfig
EOF

echo ""
echo "✅ QAgent Frontend Enhancement Complete!"
echo ""
echo "📋 Next steps:"
echo "   1. cd apps/frontend"
echo "   2. npm install"
echo "   3. npm run dev"
echo ""
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "🔌 Make sure backend is running at: http://localhost:3001"
echo ""
