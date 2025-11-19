export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            By using QAGenAI, you agree to these Terms of Service. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
          <p className="text-gray-700 leading-relaxed">
            QAGenAI is an AI-powered platform that generates QA test suites based on user-provided specifications.
            We do not guarantee the accuracy or suitability of generated output for any specific purpose.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>You are responsible for the content you upload</li>
            <li>You agree not to upload illegal or harmful content</li>
            <li>You agree not to abuse the service or attempt to bypass usage limits</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed">
            QAGenAI owns all rights to the platform and its content. You retain ownership of your uploaded content
            and may use generated output for your own projects without restriction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Subscriptions & Billing</h2>
          <p className="text-gray-700 leading-relaxed">
            Pro plan is billed monthly or annually via Stripe. You can cancel anytime. Refunds are handled according 
            to Stripe policies and our refund policy (if applicable).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            QAGenAI is provided "as is" without warranties of any kind. We are not liable for any damages arising from
            the use of the service, to the maximum extent permitted by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
          <p className="text-gray-700 leading-relaxed">
            We may suspend or terminate access to the service if you violate these terms or misuse the platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update these Terms from time to time. Changes will be posted on this page with an updated date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
          <p className="text-gray-700 leading-relaxed">
            For questions about these Terms, contact us at: <a href="mailto:legal@qagenai.com" className="text-blue-600 hover:underline">legal@qagenai.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
