// app/book/[bookingUrl]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Star } from 'lucide-react';
import { ServiceSelection } from '@/components/booking/ServiceSelection';
import { TeamMemberSelection } from '@/components/booking/TeamMemberSelection';
import { DateTimeSelection } from '@/components/booking/DateTimeSelection';
import { BookingReview } from '@/components/booking/BookingReview';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { Button } from '@/components/ui/button';
import type { Shop, BookingFlowState } from '@/types/database';

type BookingStep = 'service' | 'professional' | 'time' | 'review' | 'confirm';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingUrl = params.bookingUrl as string;

  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<BookingFlowState>({
    shopId: '',
    shopName: '',
    shopAddress: '',
    serviceId: null,
    serviceName: null,
    servicePrice: null,
    serviceDuration: null,
    categoryColor: null,
    variantId: null,
    variantName: null,
    teamMemberId: null,
    teamMemberName: null,
    teamMemberPrice: null,
    selectedDate: null,
    selectedTime: null,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    sessionId: undefined,
  });

  // Memoize fetchShopDetails with useCallback
  const fetchShopDetails = useCallback(async () => {
    if (!bookingUrl) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/public/shop/${bookingUrl}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Shop not found');
          router.push('/404');
        } else {
          throw new Error('Failed to load shop details');
        }
        return;
      }

      const { data } = await response.json();

      if (data) {
        setShop(data);
        setBookingState((prev) => ({
          ...prev,
          shopId: data.id,
          shopName: data.name,
          shopAddress: data.address,
        }));
      } else {
        setError('Shop information not available');
      }
    } catch (err) {
      console.error('Error fetching shop:', err);
      setError('Failed to load shop information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bookingUrl, router]);

  useEffect(() => {
    fetchShopDetails();
  }, [fetchShopDetails]);

  const handleNext = () => {
    const steps: BookingStep[] = [
      'service',
      'professional',
      'time',
      'review',
      'confirm',
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: BookingStep[] = [
      'service',
      'professional',
      'time',
      'review',
      'confirm',
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 'service':
        return bookingState.serviceId !== null;
      case 'professional':
        return bookingState.teamMemberId !== null;
      case 'time':
        return (
          bookingState.selectedDate !== null &&
          bookingState.selectedTime !== null
        );
      case 'review':
        return !!(bookingState.clientName && bookingState.clientEmail);
      default:
        return true;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking information...</p>
        </div>
      </div>
    );
  }

  if (error && !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 mx-auto w-16 h-16 mb-4 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Go back home
          </Button>
        </div>
      </div>
    );
  }

  if (!shop) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={currentStep === 'service'}
            >
              <ChevronLeft
                className={
                  currentStep === 'service' ? 'text-gray-300' : 'text-gray-600'
                }
              />
            </button>

            <div className="text-center">
              <h1 className="font-semibold text-gray-900">{shop.name}</h1>
              <div className="flex items-center justify-center text-sm text-gray-500 mt-1">
                <MapPin size={14} className="mr-1" />
                {shop.address}
              </div>
            </div>

            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-gray-600">✕</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <BookingProgress currentStep={currentStep} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div
          className={`grid grid-cols-1 ${
            currentStep === 'confirm' ? '' : 'lg:grid-cols-3'
          } gap-6`}
        >
          {/* Left Content - Steps */}
          <div
            className={
              currentStep === 'confirm' ? 'col-span-1' : 'lg:col-span-2'
            }
          >
            {currentStep === 'service' && (
              <ServiceSelection
                shopId={shop.id}
                bookingState={bookingState}
                onUpdate={setBookingState}
              />
            )}

            {currentStep === 'professional' && bookingState.serviceId && (
              <TeamMemberSelection
                shopId={shop.id}
                serviceId={bookingState.serviceId}
                bookingState={bookingState}
                onUpdate={setBookingState}
              />
            )}

            {currentStep === 'time' &&
              bookingState.teamMemberId &&
              bookingState.serviceDuration && (
                <DateTimeSelection
                  shopId={shop.id}
                  teamMemberId={bookingState.teamMemberId}
                  serviceDuration={bookingState.serviceDuration}
                  bookingState={bookingState}
                  onUpdate={setBookingState}
                />
              )}

            {currentStep === 'review' && (
              <BookingReview
                bookingState={bookingState}
                onUpdate={setBookingState}
              />
            )}

            {currentStep === 'confirm' && (
              <BookingConfirmation
                bookingState={bookingState}
                shopId={shop.id}
              />
            )}
          </div>

          {/* Right Sidebar - Summary - Only show if not on confirm step */}
          {currentStep !== 'confirm' && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Booking Summary
                </h3>

                {/* Shop Info */}
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <MapPin className="text-gray-500" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{shop.name}</p>
                    <p className="text-xs text-gray-500">{shop.address}</p>
                    <div className="flex items-center mt-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-xs text-gray-600 ml-1">
                        5.0 (2,711)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  {bookingState.serviceName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium text-right">
                        {bookingState.serviceName}
                        {bookingState.variantName && (
                          <span className="block text-xs text-gray-500">
                            {bookingState.variantName}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {bookingState.teamMemberName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Professional:</span>
                      <span className="font-medium">
                        {bookingState.teamMemberName}
                      </span>
                    </div>
                  )}

                  {bookingState.selectedDate && bookingState.selectedTime && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">
                          {bookingState.selectedDate.toLocaleDateString(
                            'en-US',
                            {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">
                          {bookingState.selectedTime}
                        </span>
                      </div>
                    </>
                  )}

                  {bookingState.serviceDuration && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">
                        {bookingState.serviceDuration} mins
                      </span>
                    </div>
                  )}
                </div>

                {bookingState.teamMemberPrice && (
                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-semibold text-lg">
                        ${bookingState.teamMemberPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full mt-6"
                  onClick={handleNext}
                  disabled={!isStepValid()}
                >
                  {currentStep === 'review' ? 'Confirm Booking' : 'Continue'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
