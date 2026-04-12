import { motion } from 'motion/react';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-lg max-w-none text-gray-600">
          <p className="mb-4">Last updated: May 2026</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Agreement to Terms</h2>
          <p className="mb-4">
            By accessing our website and purchasing tickets for TEDx Lokoja, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Ticket Purchases and Refunds</h2>
          <p className="mb-4">
            All ticket sales are final. We do not offer refunds or exchanges for tickets purchased, except in the event that the conference is entirely canceled. If the event is postponed, your ticket will be valid for the rescheduled date.
          </p>
          <p className="mb-4">
            Tickets are for personal use and may not be resold for commercial gain. We reserve the right to cancel any tickets we believe have been resold.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Event Code of Conduct</h2>
          <p className="mb-4">
            TEDx Lokoja is dedicated to providing a harassment-free conference experience for everyone, regardless of gender, gender identity and expression, sexual orientation, disability, physical appearance, body size, race, age or religion. We do not tolerate harassment of conference participants in any form.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Media Release</h2>
          <p className="mb-4">
            By attending TEDx Lokoja, you acknowledge and agree that you may be photographed, filmed, or recorded. You grant TEDx Lokoja and its affiliates the right to use these media materials for promotional, educational, and other purposes without compensation.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
