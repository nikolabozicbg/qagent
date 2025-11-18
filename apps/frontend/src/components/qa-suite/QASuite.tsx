"use client";

import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ListTree, Lock, Server, TestTube2 } from "lucide-react";

interface RTMItem {
  requirement_id: string;
  scenario: string;
  test_cases: string;
  coverage: string;
  priority: string;
}

interface BVAItem {
  field: string;
  type: string;
  min: string;
  max: string;
  invalid_examples: string;
  notes: string;
}

interface APIItem {
  endpoint: string;
  method: string;
  auth: string;
  scenarios: string;
  status_codes: string;
}

interface NegativeItem {
  test: string;
  desc?: string;
  description?: string;
  severity: string;
}

interface CompatibilityItem {
  platform: string;
  status: string;
  notes: string;
}

interface QASuiteData {
  negatives?: NegativeItem[];
  security?: (string | { title?: string; test?: string; desc?: string; description?: string })[];
  risk?: string[];
  compatibility?: CompatibilityItem[];
  testData?: any;
  rtm?: RTMItem[];
  bva?: BVAItem[];
  api_suite?: APIItem[];
}

interface QASuiteProps {
  data?: QASuiteData;
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
  const rtm = Array.isArray(data.rtm) ? data.rtm : [];
  const bva = Array.isArray(data.bva) ? data.bva : [];
  const apiSuite = Array.isArray(data.api_suite) ? data.api_suite : [];

  // If no QA data, don't render
  if (negatives.length === 0 && security.length === 0 && compatibility.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 space-y-20">
      {/* Sticky Sidebar Navigation */}
      <nav className="fixed right-6 top-40 hidden xl:block w-52 bg-white/70 backdrop-blur-xl border rounded-xl shadow-sm p-4 space-y-3 z-20">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">QA Analysis</p>
        {rtm.length > 0 && <a href="#rtm" className="block text-sm hover:text-blue-600 transition">📋 Traceability Matrix</a>}
        {negatives.length > 0 && <a href="#negative" className="block text-sm hover:text-blue-600 transition">⚠️ Negative Tests</a>}
        {bva.length > 0 && <a href="#bva" className="block text-sm hover:text-blue-600 transition">📊 BVA / EP</a>}
        {security.length > 0 && <a href="#security" className="block text-sm hover:text-blue-600 transition">🔒 Security Tests</a>}
        {apiSuite.length > 0 && <a href="#api" className="block text-sm hover:text-blue-600 transition">🌐 API Suite</a>}
      </nav>

      {/* Traceability Matrix */}
      {rtm.length > 0 && (
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
                {rtm.map((item: any, i: number) => {
                  const coverage = item.coverage || 'Unknown';
                  const priority = item.priority || 'Medium';
                  
                  const coverageColor = coverage === 'Full' 
                    ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
                  
                  const priorityColor = priority === 'High' 
                    ? 'bg-red-100 text-red-600 hover:bg-red-100' 
                    : priority === 'Low'
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-100'
                    : 'bg-orange-100 text-orange-600 hover:bg-orange-100';

                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.requirement_id}</TableCell>
                      <TableCell>{item.scenario}</TableCell>
                      <TableCell className="font-mono text-sm">{item.test_cases}</TableCell>
                      <TableCell><Badge className={coverageColor}>{coverage}</Badge></TableCell>
                      <TableCell><Badge className={priorityColor}>{priority}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </motion.section>
      )}

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
      {bva.length > 0 && (
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
                {bva.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.field}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="font-mono">{item.min}</TableCell>
                    <TableCell className="font-mono">{item.max}</TableCell>
                    <TableCell className="font-mono text-red-600">{item.invalid_examples}</TableCell>
                    <TableCell>{item.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.section>
      )}

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
      {apiSuite.length > 0 && (
        <motion.section 
          id="api" 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.4 }}
          className="scroll-mt-20"
        >
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Server className="w-7 h-7 text-green-600" /> 
            API Test Suite
          </h2>
          <div className="space-y-4">
            {apiSuite.map((item: any, i: number) => (
              <APICard 
                key={i}
                endpoint={item.endpoint}
                method={item.method}
                auth={item.auth}
                scenarios={item.scenarios}
                statusCodes={item.status_codes}
              />
            ))}
          </div>
        </motion.section>
      )}
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

function APICard({ endpoint, method, auth, scenarios, statusCodes }: any) {
  const methodColors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700",
    POST: "bg-green-100 text-green-700",
    PUT: "bg-yellow-100 text-yellow-700",
    DELETE: "bg-red-100 text-red-700",
    PATCH: "bg-purple-100 text-purple-700"
  };

  const authBadgeColor = auth === 'Required' 
    ? 'bg-red-100 text-red-700 hover:bg-red-100' 
    : 'bg-gray-100 text-gray-700 hover:bg-gray-100';

  return (
    <div className="border rounded-xl bg-white p-6 hover:shadow-md transition">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Badge className={methodColors[method] || 'bg-gray-100 text-gray-700'}>{method}</Badge>
        <code className="text-sm font-mono font-semibold">{endpoint}</code>
        <Badge className={authBadgeColor}>{auth === 'Required' ? '🔒 Auth Required' : '🔓 Public'}</Badge>
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">TEST SCENARIOS</p>
          <p className="text-sm text-gray-700">{scenarios}</p>
        </div>
        
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">STATUS CODES</p>
          <div className="flex gap-2 flex-wrap">
            {statusCodes.split(',').map((code: string, i: number) => {
              const trimmed = code.trim();
              const isSuccess = trimmed.startsWith('2');
              const isClientError = trimmed.startsWith('4');
              const isServerError = trimmed.startsWith('5');
              
              const badgeClass = isSuccess 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : isClientError
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                : isServerError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-gray-50 text-gray-700 border border-gray-200';
              
              return (
                <span key={i} className={`px-2 py-1 rounded text-xs font-mono ${badgeClass}`}>
                  {trimmed}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
