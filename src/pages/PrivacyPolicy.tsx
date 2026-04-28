import { motion } from 'motion/react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-lg max-w-none text-gray-600">
          <p className="mb-4">Last updated: May 2026</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Introduction</h2>
          <p className="mb-4">
            Welcome to TEDx Lokoja. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. The Data We Collect About You</h2>
          <p className="mb-4">
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
            <li><strong>Transaction Data</strong> includes details about payments to and from you and other details of tickets you have purchased from us.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Use Your Personal Data</h2>
          <p className="mb-4">
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., processing your ticket purchase).</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Data Security</h2>
          <p className="mb-4">
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this privacy policy or our privacy practices, please contact us at tedxlokoja.cmtty@gmail.com.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
