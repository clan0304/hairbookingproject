// components/booking/BookingProgress.tsx
import { Check } from 'lucide-react';

type BookingStep = 'service' | 'professional' | 'time' | 'review' | 'confirm';

interface BookingProgressProps {
  currentStep: BookingStep;
}

const steps = [
  { id: 'service', label: 'Services' },
  { id: 'professional', label: 'Professional' },
  { id: 'time', label: 'Time' },
  { id: 'review', label: 'Review' },
  { id: 'confirm', label: 'Confirm' },
];

export function BookingProgress({ currentStep }: BookingProgressProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="bg-white border-b">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = step.id === currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${
                        isCompleted
                          ? 'bg-purple-600 text-white'
                          : isCurrent
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {isCompleted ? <Check size={16} /> : index + 1}
                  </div>
                  <span
                    className={`ml-2 text-sm hidden sm:block ${
                      isCurrent
                        ? 'text-purple-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
