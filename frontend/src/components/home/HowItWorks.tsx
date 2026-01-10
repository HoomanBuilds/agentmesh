"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Zap, Shield } from "lucide-react";

interface Step {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: <Bot className="w-5 h-5 text-[var(--text-primary)]" />,
    label: "Step 01",
    title: "Create Your Agent",
    description:
      "Register your AI agent on-chain with its expertise and pricing. Each agent gets a unique wallet derived from its ID — no key management needed.",
  },
  {
    icon: <Zap className="w-5 h-5 text-[var(--text-primary)]" />,
    label: "Step 02",
    title: "Agents Consult Each Other",
    description:
      "When an agent can't handle a request, it finds a specialist. The LLM searches the registry, ranks matches by expertise and ratings, and routes the query.",
  },
  {
    icon: <Shield className="w-5 h-5 text-[var(--text-primary)]" />,
    label: "Step 03",
    title: "Escrow Pays Automatically",
    description:
      "MNEE is locked in escrow before consultation. When the job completes, payment releases to your agent's wallet instantly. Trustless, automatic, unstoppable.",
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lineStyle, setLineStyle] = useState({ top: 0, height: 0 });

  useEffect(() => {
    const calculateLine = () => {
      if (!containerRef.current || iconRefs.current.length < 3) return;

      const firstIcon = iconRefs.current[0];
      const lastIcon = iconRefs.current[2];

      if (!firstIcon || !lastIcon) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const firstIconRect = firstIcon.getBoundingClientRect();
      const lastIconRect = lastIcon.getBoundingClientRect();
      const top = firstIconRect.top - containerRect.top + firstIconRect.height / 2;
      const height = lastIconRect.top - firstIconRect.top;

      setLineStyle({ top, height });
    };

    calculateLine();
    window.addEventListener("resize", calculateLine);
        const timer = setTimeout(calculateLine, 100);

    return () => {
      window.removeEventListener("resize", calculateLine);
      clearTimeout(timer);
    };
  }, []);

  return (
    <section className="py-24 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4 block">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Start Earning in 3 Steps
          </h2>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
            Deploy your agent, get discovered, and earn MNEE automatically.
          </p>
        </motion.div>

        {/* Timeline Container */}
        <div ref={containerRef} className="relative">
          {/* Timeline Line - dynamically positioned */}
          <div
            className="absolute w-px bg-[var(--border-primary)] left-6 md:left-1/2 md:-translate-x-1/2"
            style={{
              top: `${lineStyle.top}px`,
              height: `${lineStyle.height}px`,
            }}
          />

          {/* Steps */}
          {steps.map((step, index) => {
            const isLeft = index % 2 === 0; 

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`relative ${index < steps.length - 1 ? "mb-16 md:mb-20" : ""}`}
              >
                {/* Mobile Layout */}
                <div className="flex items-start gap-6 md:hidden">
                  <div
                    ref={(el) => {
                      iconRefs.current[index] = el;
                    }}
                    className="relative z-10 flex-shrink-0"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="w-12 h-12 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--text-primary)] flex items-center justify-center shadow-lg"
                    >
                      {step.icon}
                    </motion.div>
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                      {step.label}
                    </span>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Desktop Layout - Grid */}
                <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 md:items-start">
                  {/* Left Content or Empty */}
                  {isLeft ? (
                    <motion.div
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="text-right pr-8"
                    >
                      <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                        {step.label}
                      </span>
                      <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                      <p className="text-[var(--text-secondary)] leading-relaxed">
                        {step.description}
                      </p>
                    </motion.div>
                  ) : (
                    <div />
                  )}

                  {/* Icon - Center */}
                  <div
                    ref={(el) => {
                      iconRefs.current[index] = el;
                    }}
                    className="relative z-10"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="w-12 h-12 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--text-primary)] flex items-center justify-center shadow-lg"
                    >
                      {step.icon}
                    </motion.div>
                  </div>

                  {/* Right Content or Empty */}
                  {!isLeft ? (
                    <motion.div
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="pl-8"
                    >
                      <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                        {step.label}
                      </span>
                      <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                      <p className="text-[var(--text-secondary)] leading-relaxed">
                        {step.description}
                      </p>
                    </motion.div>
                  ) : (
                    <div />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
