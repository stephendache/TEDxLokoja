import { motion } from 'motion/react';
import { Target, Heart, Users, Lightbulb, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function About() {
  const team = [
    { name: 'Paul Stephen Edache', role: 'Lead Organizer', image: 'https://picsum.photos/seed/paul/400/400' },
    { name: 'Jane Doe', role: 'Co-Organizer', image: 'https://picsum.photos/seed/jane/400/400' },
    { name: 'John Smith', role: 'Curation Lead', image: 'https://picsum.photos/seed/john/400/400' },
    { name: 'Sarah Johnson', role: 'Communications', image: 'https://picsum.photos/seed/sarah/400/400' },
  ];

  return (
    <div className="bg-white min-h-screen">
      <SEO 
        title="About Us" 
        description="Learn about TEDx Lokoja, our mission, our values, and the passionate team working to bring ideas worth spreading to the heart of Kogi State."
      />
      {/* Hero Section */}
      <section className="relative bg-black text-white py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/tedx-about/1920/1080')] bg-cover bg-center" />
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
              About <span className="text-red-600">TEDx</span> Lokoja
            </h1>
            <p className="text-xl text-gray-300 font-light leading-relaxed">
              Discover our mission, our values, and the passionate team working to bring ideas worth spreading to the heart of Kogi State.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold tracking-tighter mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                TEDx is a grassroots initiative, created in the spirit of TED's overall mission to research and discover "ideas worth spreading." TEDx brings the spirit of TED to local communities around the globe through TEDx events.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                At TEDx Lokoja, our goal is to spark deep discussion, foster connections, and highlight the incredible innovation and resilience present in our community. We believe that local ideas have the power to create global impact.
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-2 gap-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <Target className="text-red-600 mb-4" size={32} />
                <h3 className="font-bold mb-2">Purpose Driven</h3>
                <p className="text-sm text-gray-600">Focused on actionable ideas that solve real problems.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mt-8">
                <Users className="text-red-600 mb-4" size={32} />
                <h3 className="font-bold mb-2">Community First</h3>
                <p className="text-sm text-gray-600">Built by the community, for the community.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 -mt-8">
                <Lightbulb className="text-red-600 mb-4" size={32} />
                <h3 className="font-bold mb-2">Innovation</h3>
                <p className="text-sm text-gray-600">Celebrating new perspectives and creative solutions.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <Heart className="text-red-600 mb-4" size={32} />
                <h3 className="font-bold mb-2">Inclusivity</h3>
                <p className="text-sm text-gray-600">A platform where every voice and background matters.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Theme Section */}
      <section className="py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-red-600 font-bold tracking-widest uppercase mb-4 text-sm">2026 Theme</h2>
            <h3 className="text-5xl md:text-6xl font-bold tracking-tighter mb-8">Start Where You Are</h3>
            <div className="text-lg text-gray-300 leading-relaxed space-y-6 text-left md:text-center">
              <p>
                Often, we wait for the perfect moment, the ideal resources, or the right connections before we take action. But history's greatest transformations didn't begin in perfection; they began in the present.
              </p>
              <p>
                <strong>"Start Where You Are"</strong> is a call to action. It is an invitation to look at our immediate surroundings, recognize the tools we already possess, and take that crucial first step towards change. Whether it's in technology, education, arts, or social justice, the most profound journeys begin exactly where we stand today.
              </p>
              <p>
                Join us as we explore stories of resilience, grassroots innovation, and the extraordinary power of beginning.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Meet the Team</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The passionate individuals working tirelessly behind the scenes to make TEDx Lokoja a reality.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {team.map((member, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="aspect-square rounded-3xl overflow-hidden mb-4 bg-gray-100">
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-xl font-bold">{member.name}</h3>
                <p className="text-red-600 font-medium text-sm">{member.role}</p>
              </motion.div>
            ))}
          </motion.div>
          
          <div className="mt-20 text-center">
            <Link 
              to="/contact"
              className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-full text-lg font-bold transition-colors"
            >
              Get in Touch <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
