export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            QAgent collects the following information to provide and improve our services:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Documents you upload:</strong> PDF, DOCX, TXT, and MD files containing specifications</li>
            <li><strong>Text input:</strong> Feature descriptions and requirements you provide</li>
            <li><strong>Usage data:</strong> Generation counts, timestamps, and feature usage</li>
            <li><strong>Email addresses:</strong> When you join our waitlist or create an account (optional)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use collected information to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Generate AI-powered test suites using OpenAI's API</li>
            <li>Improve our service quality and accuracy</li>
            <li>Track usage limits for Free and Pro tiers</li>
            <li>Send product updates and promotional emails (opt-in only)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Third-Party Services</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            QAgent uses the following third-party services:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>OpenAI:</strong> Your uploaded content is processed by OpenAI's API to generate test suites. See <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener" className="text-blue-600 hover:underline">OpenAI Privacy Policy</a></li>
            <li><strong>Stripe:</strong> Payment processing for Pro subscriptions (PCI compliant)</li>
            <li><strong>Vercel/Hosting:</strong> Application hosting and delivery</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Data Retention</h2>
          <p className="text-gray-700 leading-relaxed">
            We do not permanently store your uploaded documents or generated test suites on our servers. 
            Data is temporarily cached in your browser's sessionStorage and cleared when you close the tab. 
            Usage counts and email addresses (if provided) are stored securely.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Your Rights (GDPR)</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you are in the EU/EEA, you have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Access your personal data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
            <li>Data portability</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            To exercise these rights, contact us at <a href="mailto:privacy@qagent.com" className="text-blue-600 hover:underline">privacy@qagent.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
          <p className="text-gray-700 leading-relaxed">
            QAgent uses localStorage to track usage limits and preferences. We do not use tracking cookies 
            for advertising. Analytics cookies (if enabled) are used solely to improve our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Security</h2>
          <p className="text-gray-700 leading-relaxed">
            We implement industry-standard security measures to protect your data. All communication 
            with our servers uses HTTPS encryption. However, no method of transmission over the Internet 
            is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            QAgent is not intended for users under 13 years of age. We do not knowingly collect 
            information from children.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page 
            with an updated "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            For privacy-related questions, contact us at:
          </p>
          <p className="text-gray-700 mt-2">
            Email: <a href="mailto:privacy@qagent.com" className="text-blue-600 hover:underline">privacy@qagent.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
