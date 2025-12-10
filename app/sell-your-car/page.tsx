'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Car, 
  Calculator, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Banknote,
  ChevronDown,
  Loader2,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

interface PriceEstimate {
  status: string;
  input: {
    model: string;
    trim: string | null;
    year: number;
    mileage_km: number;
  };
  pricing: {
    offer_price: number;
    offer_range: {
      low: number;
      high: number;
    };
    market_value: number;
    margin_percent: number;
    confidence: string;
    comparable_listings: number;
    mileage_adjustment: number;
    specs_used: string;
  };
  market_data: {
    avg_market_price: number;
    min_price: number;
    max_price: number;
    sample_years: number[];
    sample_trims: string[];
    specs_breakdown?: Record<string, number>;
  };
}

export default function SellYourCarPage() {
  const [models, setModels] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState({ min_year: 2016, max_year: 2025 });
  
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedTrim, setSelectedTrim] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [mileage, setMileage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingTrims, setLoadingTrims] = useState(false);
  const [result, setResult] = useState<PriceEstimate | null>(null);
  const [error, setError] = useState('');

  // Fetch available models on mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Fetch trims when model changes
  useEffect(() => {
    if (selectedModel) {
      fetchTrims(selectedModel);
      setSelectedTrim('');
      setResult(null);
    } else {
      setTrims([]);
    }
  }, [selectedModel]);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/mercedes-pricing/models');
      const data = await res.json();
      setModels(data.models || []);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchTrims = async (model: string) => {
    setLoadingTrims(true);
    try {
      const res = await fetch(`/api/mercedes-pricing/trims/${encodeURIComponent(model)}`);
      const data = await res.json();
      setTrims(data.trims || []);
      if (data.year_range) {
        setYearRange(data.year_range);
      }
    } catch (err) {
      console.error('Failed to fetch trims:', err);
    } finally {
      setLoadingTrims(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    
    if (!selectedModel || !selectedYear || !mileage) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch('/api/mercedes-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          year: parseInt(selectedYear),
          mileage: parseInt(mileage.replace(/,/g, '')),
          trim: (selectedTrim && selectedTrim !== 'any') ? selectedTrim : undefined
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get price estimate');
      }
      
      setResult(data);
      
      // Scroll to result
      setTimeout(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AE').format(Math.round(price));
  };

  const formatMileage = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num ? parseInt(num).toLocaleString() : '';
  };

  const generateYears = () => {
    const years = [];
    for (let y = yearRange.max_year; y >= yearRange.min_year; y--) {
      years.push(y);
    }
    return years;
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Image
            src="/assets/icons/silberarrows-logo.png"
            alt="SilberArrows"
            width={180}
            height={54}
            className="h-12 w-auto"
          />
          <a 
            href="tel:+971561742746"
            className="hidden md:flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span className="text-sm font-medium">+971 56 174 2746</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center pt-20">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-black/70" />
          <div 
            className="absolute right-0 top-0 w-[60%] h-full bg-cover bg-center opacity-60"
            style={{ 
              backgroundImage: 'url(/assets/images/hero-bg-silver-optimized.jpg)',
              clipPath: 'polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%)'
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 py-16">
          <div className="max-w-2xl">
            {/* Logo */}
            <Image
              src="/assets/icons/silberarrows-logo.png"
              alt="SilberArrows"
              width={280}
              height={84}
              className="h-20 w-auto mb-6"
            />
            
            {/* Tagline */}
            <p className="text-zinc-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              Instant Cash Offers
            </p>
            
            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tight mb-6">
              SELL YOUR<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 via-white to-zinc-400">
                MERCEDES-BENZ
              </span><br />
              TODAY
            </h1>
            
            {/* Subtitle */}
            <p className="text-zinc-400 text-lg max-w-lg mb-8">
              Get an instant market valuation and cash offer for your Mercedes-Benz.
              No obligations, no hidden fees.
            </p>
            
            {/* Highlights */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Badge variant="outline" className="bg-white/5 border-white/20 text-white px-4 py-2">
                <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                Instant Valuation
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/20 text-white px-4 py-2">
                <Banknote className="h-4 w-4 mr-2 text-green-400" />
                Same Day Payment
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/20 text-white px-4 py-2">
                <Shield className="h-4 w-4 mr-2 text-blue-400" />
                Free Inspection
              </Badge>
            </div>
            
            {/* CTA */}
            <Button 
              size="lg"
              onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-black hover:bg-zinc-200 font-bold text-lg px-8 py-6 h-auto"
            >
              GET YOUR VALUATION
              <ChevronDown className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              GET YOUR INSTANT OFFER
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Enter your vehicle details below. Our pricing engine analyzes real market data
              to give you a fair, competitive offer.
            </p>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-zinc-400" />
                Vehicle Details
              </CardTitle>
              <CardDescription>
                All fields are required for accurate valuation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-zinc-300">Model</Label>
                  <Select 
                    value={selectedModel} 
                    onValueChange={setSelectedModel}
                    disabled={loadingModels}
                  >
                    <SelectTrigger className="bg-black/50 border-zinc-700 text-white h-12">
                      <SelectValue placeholder={loadingModels ? "Loading models..." : "Select Model"} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {models.map(model => (
                        <SelectItem key={model} value={model} className="text-white hover:bg-zinc-800">
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Trim */}
                <div className="space-y-2">
                  <Label htmlFor="trim" className="text-zinc-300">
                    Trim <span className="text-zinc-500">(Optional)</span>
                  </Label>
                  <Select 
                    value={selectedTrim} 
                    onValueChange={setSelectedTrim}
                    disabled={!selectedModel || loadingTrims}
                  >
                    <SelectTrigger className="bg-black/50 border-zinc-700 text-white h-12">
                      <SelectValue placeholder={
                        loadingTrims ? "Loading trims..." : 
                        selectedModel ? "Select Trim (Optional)" : 
                        "Select model first"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="any" className="text-white hover:bg-zinc-800">
                        Any Trim
                      </SelectItem>
                      {trims.map(trim => (
                        <SelectItem key={trim} value={trim} className="text-white hover:bg-zinc-800">
                          {trim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year and Mileage Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Year */}
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-zinc-300">Year</Label>
                    <Select 
                      value={selectedYear} 
                      onValueChange={setSelectedYear}
                      disabled={!selectedModel}
                    >
                      <SelectTrigger className="bg-black/50 border-zinc-700 text-white h-12">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {generateYears().map(year => (
                          <SelectItem key={year} value={year.toString()} className="text-white hover:bg-zinc-800">
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mileage */}
                  <div className="space-y-2">
                    <Label htmlFor="mileage" className="text-zinc-300">Mileage (km)</Label>
                    <Input
                      id="mileage"
                      type="text"
                      value={mileage}
                      onChange={(e) => setMileage(formatMileage(e.target.value))}
                      placeholder="e.g. 50,000"
                      className="bg-black/50 border-zinc-700 text-white h-12 placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || !selectedModel || !selectedYear || !mileage}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-14 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-5 w-5" />
                      Get My Offer
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Result Section */}
          {result && (
            <div id="result" className="mt-8 space-y-6">
              {/* Main Offer Card */}
              <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-700 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
                <CardContent className="pt-8 pb-8 relative">
                  <div className="text-center mb-8">
                    <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">
                      Our Instant Offer
                    </p>
                    <div className="text-6xl md:text-7xl font-black text-green-400 mb-2">
                      AED {formatPrice(result.pricing.offer_price)}
                    </div>
                    <p className="text-zinc-500">
                      Offer Range: AED {formatPrice(result.pricing.offer_range.low)} - {formatPrice(result.pricing.offer_range.high)}
                    </p>
                  </div>

                  {/* Market Comparison */}
                  <div className="bg-black/30 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-zinc-500 text-sm mb-1">Market Value</p>
                        <p className="text-2xl font-bold text-white">
                          AED {formatPrice(result.pricing.market_value)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-500 text-sm mb-1">Our Margin</p>
                        <p className="text-2xl font-bold text-blue-400">
                          {result.pricing.margin_percent}% below market
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex justify-center gap-3 flex-wrap mb-8">
                    <Badge 
                      variant="outline" 
                      className={`px-4 py-2 ${
                        result.pricing.confidence === 'high' 
                          ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                          : result.pricing.confidence === 'medium'
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                            : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {result.pricing.confidence.charAt(0).toUpperCase() + result.pricing.confidence.slice(1)} Confidence
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={`px-4 py-2 ${
                        result.pricing.specs_used === 'GCC' 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                          : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      }`}
                    >
                      {result.pricing.specs_used === 'GCC' ? '🇦🇪' : '🌍'} {result.pricing.specs_used}
                    </Badge>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-white">{result.pricing.comparable_listings}</p>
                      <p className="text-xs text-zinc-500">Listings Analyzed</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-white">AED {formatPrice(result.market_data.avg_market_price)}</p>
                      <p className="text-xs text-zinc-500">Market Average</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-white">AED {formatPrice(result.market_data.min_price)}</p>
                      <p className="text-xs text-zinc-500">Lowest Listed</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-white">AED {formatPrice(result.market_data.max_price)}</p>
                      <p className="text-xs text-zinc-500">Highest Listed</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <Zap className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                      <p className="text-xs text-zinc-400">Instant Payment</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <Shield className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                      <p className="text-xs text-zinc-400">Free Inspection</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <Car className="h-6 w-6 text-green-400 mx-auto mb-2" />
                      <p className="text-xs text-zinc-400">We Handle Transfer</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="text-center">
                    <p className="text-zinc-400 mb-4">Ready to sell? Get your cash today!</p>
                    <Button
                      size="lg"
                      asChild
                      className="bg-green-600 hover:bg-green-700 text-white font-bold h-14 px-8 text-lg"
                    >
                      <a
                        href={`https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20would%20like%20to%20sell%20my%20${encodeURIComponent(result.input.year + ' Mercedes-Benz ' + result.input.model)}%20with%20${encodeURIComponent(formatPrice(result.input.mileage_km))}km.%20Your%20offer%20was%20AED%20${encodeURIComponent(formatPrice(result.pricing.offer_price))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Accept Offer on WhatsApp
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Why Sell With Us Section */}
      <section className="py-20 px-4 md:px-8 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              WHY SELL WITH US?
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Skip the hassle of private sales. Get a fair price with zero stress.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <TrendingUp className="h-8 w-8" />,
                title: 'FAIR MARKET PRICE',
                description: 'Our pricing is based on real market data from thousands of listings.'
              },
              {
                icon: <Zap className="h-8 w-8" />,
                title: 'INSTANT PAYMENT',
                description: 'Get paid the same day. No waiting, no financing delays.'
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: 'FREE INSPECTION',
                description: 'Our experts inspect your car at your location. No hidden fees.'
              },
              {
                icon: <Users className="h-8 w-8" />,
                title: 'NO HAGGLING',
                description: 'Our offer is our best price. No back-and-forth negotiation.'
              },
              {
                icon: <Car className="h-8 w-8" />,
                title: 'WE HANDLE EVERYTHING',
                description: 'Transfer, paperwork, and registration - we take care of it all.'
              },
              {
                icon: <Clock className="h-8 w-8" />,
                title: '24-HOUR PROCESS',
                description: 'From valuation to payment, the entire process takes less than a day.'
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-4 text-white">
                    {feature.icon}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              CONTACT US
            </h2>
            <p className="text-zinc-400">
              Have questions? We&apos;re here to help.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6">
                <Phone className="h-8 w-8 text-white mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Call Us</h3>
                <p className="text-zinc-400 text-sm mb-4">For immediate assistance</p>
                <a 
                  href="tel:+971561742746"
                  className="text-white font-bold text-xl hover:text-zinc-300 transition-colors"
                >
                  +971 56 174 2746
                </a>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6">
                <MessageCircle className="h-8 w-8 text-green-400 mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">WhatsApp</h3>
                <p className="text-zinc-400 text-sm mb-4">Quick enquiries</p>
                <a 
                  href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20would%20like%20to%20sell%20my%20Mercedes-Benz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 font-bold text-xl hover:text-green-300 transition-colors"
                >
                  Start Chat →
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Working Hours */}
          <Card className="mt-6 bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-zinc-400" />
                <h3 className="text-white font-bold text-lg">Working Hours</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Monday - Saturday</span>
                  <span className="text-white font-medium">8:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Sunday</span>
                  <span className="text-zinc-500">Closed</span>
                </div>
              </div>
              <Separator className="my-4 bg-zinc-800" />
              <div>
                <p className="text-zinc-400 text-sm">
                  <strong className="text-white">Visit Us:</strong> Al Manara Street, Al Quoz, Dubai
                </p>
                <p className="text-zinc-400 text-sm mt-1">
                  <strong className="text-white">Email:</strong> sales@silberarrows.com
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-zinc-800">
        <div className="grid grid-cols-2">
          <a 
            href="tel:+971561742746"
            className="flex items-center justify-center gap-3 py-5 text-white hover:bg-zinc-900 transition-colors border-r border-zinc-800"
          >
            <Phone className="h-5 w-5 text-zinc-400" />
            <span className="font-semibold">Call Us</span>
          </a>
          <a 
            href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20would%20like%20to%20sell%20my%20Mercedes-Benz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-5 text-white hover:bg-zinc-900 transition-colors"
          >
            <MessageCircle className="h-5 w-5 text-green-400" />
            <span className="font-semibold">WhatsApp</span>
          </a>
        </div>
      </footer>

      {/* Bottom Padding for Fixed Footer */}
      <div className="h-20" />
    </div>
  );
}
