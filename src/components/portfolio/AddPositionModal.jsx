
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Plus, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function AddPositionModal({ onClose, onSubmit, currentPrices }) {
  const [formData, setFormData] = useState({
    symbol: '',
    option_type: '',
    strike_price: '',
    expiration_date: '',
    premium_paid: '',
    contracts: '1',
    strategy_type: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validateForm = () => {
    if (!formData.symbol) {
      return 'Please select a symbol';
    }
    if (!formData.option_type) {
      return 'Please select an option type';
    }
    if (!formData.strike_price || parseFloat(formData.strike_price) <= 0) {
      return 'Please enter a valid strike price';
    }
    if (!formData.expiration_date) {
      return 'Please select an expiration date';
    }
    if (!formData.premium_paid || parseFloat(formData.premium_paid) <= 0) {
      return 'Please enter a valid premium amount';
    }
    if (!formData.contracts || parseInt(formData.contracts) <= 0) {
      return 'Please enter a valid number of contracts';
    }
    if (!formData.strategy_type) {
      return 'Please select a strategy type';
    }
    if (!formData.entry_date) {
      return 'Please enter an entry date';
    }

    // Check if expiration date is in the future
    const expDate = new Date(formData.expiration_date);
    const entryDate = new Date(formData.entry_date);
    if (expDate <= entryDate) {
      return 'Expiration date must be after entry date';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const positionData = {
        symbol: formData.symbol,
        option_type: formData.option_type,
        strike_price: parseFloat(formData.strike_price),
        expiration_date: formData.expiration_date,
        premium_paid: parseFloat(formData.premium_paid),
        contracts: parseInt(formData.contracts),
        strategy_type: formData.strategy_type,
        entry_date: formData.entry_date,
        status: 'open',
        current_value: parseFloat(formData.premium_paid), // Initial value same as premium
        profit_loss: 0
      };

      await onSubmit(positionData);
    } catch (error) {
      console.error('Error adding position:', error);
      setValidationError('Failed to add position. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-slate-800/90 backdrop-blur-xl border-slate-700/50">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Add New Position</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {validationError && (
              <Alert className="mb-4 border-red-500/50 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {validationError}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Symbol <span className="text-red-400">*</span></Label>
                  <Select value={formData.symbol} onValueChange={(value) => handleChange('symbol', value)}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Select symbol" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="sBTC" className="text-white">sBTC</SelectItem>
                      <SelectItem value="STX" className="text-white">STX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Option Type <span className="text-red-400">*</span></Label>
                  <Select value={formData.option_type} onValueChange={(value) => handleChange('option_type', value)}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Call or Put" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="call" className="text-white">Call</SelectItem>
                      <SelectItem value="put" className="text-white">Put</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Strike Price <span className="text-red-400">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.strike_price}
                    onChange={(e) => handleChange('strike_price', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Enter strike price"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Premium Paid (aeUSDC) <span className="text-red-400">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.premium_paid}
                    onChange={(e) => handleChange('premium_paid', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Enter premium amount"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Expiration Date <span className="text-red-400">*</span></Label>
                  <Input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => handleChange('expiration_date', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Contracts <span className="text-red-400">*</span></Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.contracts}
                    onChange={(e) => handleChange('contracts', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Number of contracts"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Strategy Type <span className="text-red-400">*</span></Label>
                  <Select value={formData.strategy_type} onValueChange={(value) => handleChange('strategy_type', value)}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="long_call" className="text-white">Long Call</SelectItem>
                      <SelectItem value="long_put" className="text-white">Long Put</SelectItem>
                      <SelectItem value="covered_call" className="text-white">Covered Call</SelectItem>
                      <SelectItem value="cash_secured_put" className="text-white">Cash Secured Put</SelectItem>
                      <SelectItem value="iron_condor" className="text-white">Iron Condor</SelectItem>
                      <SelectItem value="butterfly" className="text-white">Butterfly</SelectItem>
                      <SelectItem value="straddle" className="text-white">Straddle</SelectItem>
                      <SelectItem value="strangle" className="text-white">Strangle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Entry Date <span className="text-red-400">*</span></Label>
                  <Input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => handleChange('entry_date', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              {/* Current Prices Display */}
              {(currentPrices?.sBTC || currentPrices?.STX) && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-slate-300 font-medium mb-2">Current Market Prices</h4>
                  <div className="flex gap-6">
                    {currentPrices?.sBTC && (
                      <div>
                        <span className="text-orange-400 font-semibold">sBTC:</span>
                        <span className="text-white ml-2">${currentPrices.sBTC.current_price?.toLocaleString()}</span>
                      </div>
                    )}
                    {currentPrices?.STX && (
                      <div>
                        <span className="text-purple-400 font-semibold">STX:</span>
                        <span className="text-white ml-2">${currentPrices.STX.current_price?.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>Adding Position...</>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Position
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
