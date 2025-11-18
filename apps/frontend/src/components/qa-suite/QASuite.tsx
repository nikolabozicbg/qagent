"use client";

import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ListTree, Lock, Server, TestTube2 } from "lucide-react";

interface QASuiteProps {
  data?: any;
}

export default function QASuite({ data }: QASuiteProps) {
  // If no data provided, don't render anything
  if (!data) return null;

  // Extract QA data from backend response
  const negatives = Array.isArray(data.negatives) ? data.negatives : [];
  const security = Array.isArray(data.security) ? data.security : [];
  const risk = Array.isArray(data.risk) ? data.risk : [];
  const compatibility = Array.isArray(data.compatibility) ? data.compatibility : [];
  const testData = data.testData || {};

  // If no QA data, don't render
  if (negatives.length === 0 && security.length === 0 && compatibility.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 space-y-20">
      {/* Sticky Sidebar Navigation */}
      <nav className="fixed right-6 top-40 hidden xl:block w-52 bg-white/70 backdrop-blur-xl border rounded-xl shadow-sm p-4 space-y-3 z-20">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">QA Analysis</p>
        <a href="#rtm" className="block text-sm hover:text-blue-600 transition">📋 Traceability Matrix</a>
        <a href="#negative" className="block text-sm hover:text-blue-600 transition">⚠️ Negative Tests</a>
        <a href="#bva" className="block text-sm hover:text-blue-600 transition">📊 BVA / EP</a>
        <a href="#security" className="block text-sm hover:text-blue-600 transition">🔒 Security Tests</a>
        <a href="#api" className="block text-sm hover:text-blue-600 transition">🌐 API Suite</a>
      </nav>

      {/* Traceability Matrix */}
      <motion.section 
        id="rtm" 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
        className="scroll-mt-20"
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <ListTree className="w-7 h-7 text-blue-600" /> 
          Requirements Traceability Matrix
        </h2>
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Requirement ID</TableHead>
                <TableHead className="font-semibold">Scenario</TableHead>
                <TableHead className="font-semibold">Test Cases</TableHead>
                <TableHead className="font-semibold">Coverage</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">RQ-001</TableCell>
                <TableCell>User login with valid credentials</TableCell>
                <TableCell className="font-mono text-sm">TC-001, TC-002</TableCell>
                <TableCell><Badge className="bg-green-100 text-green-700 hover:bg-green-100">Full</Badge></TableCell>
                <TableCell><Badge className="bg-red-100 text-red-600 hover:bg-red-100">High</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">RQ-002</TableCell>
                <TableCell>Invalid credentials error handling</TableCell>
                <TableCell className="font-mono text-sm">TC-003, TC-004</TableCell>
                <TableCell><Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Partial</Badge></TableCell>
                <TableCell><Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100">Medium</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">RQ-003</TableCell>
                <TableCell>Password reset functionality</TableCell>
                <TableCell className="font-mono text-sm">TC-005</TableCell>
                <TableCell><Badge className="bg-green-100 text-green-700 hover:bg-green-100">Full</Badge></TableCell>
                <TableCell><Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100">Medium</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </motion.section>

      {/* Negative Tests */}
      {negatives.length > 0 && (
        <motion.section 
          id="negative" 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.1 }}
          className="scroll-mt-20"
        >
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-red-600" /> 
            Negative & Edge-Case Tests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {negatives.map((item: any, i: number) => (
              <TestCard 
                key={i}
                title={item.test || item.title || `Test ${i + 1}`}
                desc={item.description || item.desc || ''}
                severity={item.severity || 'medium'}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* BVA / EP */}
      <motion.section 
        id="bva" 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.2 }}
        className="scroll-mt-20"
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <TestTube2 className="w-7 h-7 text-purple-600" /> 
          Boundary Value Analysis & Equivalence Partitioning
        </h2>
        <div className="overflow-x-auto border rounded-xl bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold">Input Field</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Min Value</TableHead>
                <TableHead className="font-semibold">Max Value</TableHead>
                <TableHead className="font-semibold">Invalid Examples</TableHead>
                <TableHead className="font-semibold">Test Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Age</TableCell>
                <TableCell>Integer</TableCell>
                <TableCell className="font-mono">18</TableCell>
                <TableCell className="font-mono">99</TableCell>
                <TableCell className="font-mono text-red-600">-1, 0, 150</TableCell>
                <TableCell>Test min-1, min, max, max+1</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Username</TableCell>
                <TableCell>String</TableCell>
                <TableCell className="font-mono">3 chars</TableCell>
                <TableCell className="font-mono">20 chars</TableCell>
                <TableCell className="font-mono text-red-600">ab, 21+ chars</TableCell>
                <TableCell>Alphanumeric validation</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Password</TableCell>
                <TableCell>String</TableCell>
                <TableCell className="font-mono">8 chars</TableCell>
                <TableCell className="font-mono">128 chars</TableCell>
                <TableCell className="font-mono text-red-600">weak123</TableCell>
                <TableCell>Complexity requirements</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </motion.section>

      {/* Security Tests */}
      {security.length > 0 && (
        <motion.section 
          id="security" 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.3 }}
          className="scroll-mt-20"
        >
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Lock className="w-7 h-7 text-yellow-600" /> 
            Security Test Recommendations
          </h2>
          <div className="space-y-3">
            {security.map((item: any, i: number) => {
              const title = typeof item === 'string' ? item : (item.title || item.test || `Security Test ${i + 1}`);
              const desc = typeof item === 'string' ? '' : (item.description || item.desc || '');
              return <SecurityItem key={i} title={title} desc={desc} />;
            })}
          </div>
        </motion.section>
      )}

      {/* API Suite */}
      <motion.section 
        id="api" 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.4 }}
        className="scroll-mt-20"
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Server className="w-7 h-7 text-green-600" /> 
          API Test Suite (Inferred)
        </h2>
        <div className="space-y-4">
          <APIEndpoint 
            method="POST"
            path="/api/auth/login"
            description="User authentication endpoint"
            request={`{
  "email": "user@example.com",
  "password": "SecurePass123!"
}`}
            response={`// 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "user@example.com"
  }
}

// 401 Unauthorized
{
  "error": "Invalid credentials"
}`}
          />
          
          <APIEndpoint 
            method="GET"
            path="/api/user/profile"
            description="Retrieve user profile (requires auth token)"
            request="Authorization: Bearer {token}"
            response={`// 200 OK
{
  "id": "123",
  "name": "John Doe",
  "email": "user@example.com"
}`}
          />
        </div>
      </motion.section>
    </div>
  );
}

function TestCard({ title, desc, severity }: any) {
  const severityColors: Record<string, string> = {
    critical: "border-l-4 border-l-red-500",
    high: "border-l-4 border-l-orange-500",
    medium: "border-l-4 border-l-yellow-500",
    low: "border-l-4 border-l-blue-500"
  };

  return (
    <div className={`p-4 border rounded-xl bg-white hover:shadow-md transition ${severityColors[severity] || ""}`}>
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}

function SecurityItem({ title, desc }: any) {
  return (
    <div className="p-4 border rounded-xl bg-white hover:border-yellow-300 transition">
      <p className="font-semibold mb-1 flex items-center gap-2">
        <Lock className="w-4 h-4 text-yellow-600" />
        {title}
      </p>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}

function APIEndpoint({ method, path, description, request, response }: any) {
  const methodColors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700",
    POST: "bg-green-100 text-green-700",
    PUT: "bg-yellow-100 text-yellow-700",
    DELETE: "bg-red-100 text-red-700"
  };

  return (
    <div className="border rounded-xl bg-white p-6">
      <div className="flex items-center gap-3 mb-3">
        <Badge className={methodColors[method]}>{method}</Badge>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">REQUEST</p>
          <pre className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">{request}</pre>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">RESPONSE</p>
          <pre className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">{response}</pre>
        </div>
      </div>
    </div>
  );
}
