import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertTriangle, Calculator, Zap } from "lucide-react";
import { format } from "date-fns";

export default function ExpirationProcessor({ 
  position, 
  settlementPrice, 
  intrinsicValue, 
  finalPnL, 
  onConfirm, 
  onCancel 
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      await onConfirm({
        position_id: position.id,
        symbol: position.symbol,
        option_type: position.option_type,
        strike_price: position.strike_price,
        expiration_date: position.expiration_date,
        settlement_price: settlementPrice || 0,
        contracts: position.contracts || 1,
        premium_paid: position.premium_paid || 0,
        settlement_value: intrinsicValue || 0,
        final_pnl: finalPnL || 0,
        is_exercised: (intrinsicValue || 0) > 0,
        auto_processed: false,
        processed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Expiration processing failed:', error);
    }
    setIsProcessing(false);
  };

  const isInTheMoney = (intrinsicValue || 0) > 0;
  const totalPremiumPaid = (position.premium_paid || 0) * (position.contracts || 1);

  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Process Option Expiration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Position Details */}
        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">Position Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Symbol</span>
              <p className="text-white font-semibold">{position.symbol || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-400">Option Type</span>
              <div className="flex items-center gap-2">
                <Badge className={position.option_type === 'call' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                  {(position.option_type || 'unknown').toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-slate-400">Strike Price</span>
              <p className="text-white font-semibold">${(position.strike_price || 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-400">Contracts</span>
              <p className="text-white font-semibold">{position.contracts || 1}</p>
            </div>
            <div>
              <span className="text-slate-400">Expiration Date</span>
              <p className="text-white font-semibold">
                {position.expiration_date ? format(new Date(position.expiration_date), 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Premium Paid</span>
              <p className="text-white font-semibold">${totalPremiumPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Settlement Calculation */}
        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">Settlement Calculation</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Settlement Price</span>
              <span className="text-white font-semibold">${(settlementPrice || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Strike Price</span>
              <span className="text-white font-semibold">${(position.strike_price || 0).toLocaleString()}</span>
            </div>
            <Separator className="bg-slate-600" />
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Intrinsic Value</span>
              <span className={`font-semibold ${(intrinsicValue || 0) > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                ${(intrinsicValue || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Less: Premium Paid</span>
              <span className="text-red-400 font-semibold">-${totalPremiumPaid.toLocaleString()}</span>
            </div>
            <Separator className="bg-slate-600" />
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Final P&L</span>
              <span className={`font-bold text-lg ${(finalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(finalPnL || 0) >= 0 ? '+' : ''}${(finalPnL || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Expiration Status */}
        <Alert className={`${isInTheMoney ? 'border-green-500/50 bg-green-500/10' : 'border-slate-600/50 bg-slate-700/30'}`}>
          {isInTheMoney ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          )}
          <AlertDescription className={isInTheMoney ? 'text-green-300' : 'text-slate-300'}>
            <span className="font-semibold">
              {isInTheMoney ? 'In-the-Money' : 'Out-of-the-Money'}
            </span>
            {' - '}
            {isInTheMoney 
              ? 'This option will be automatically exercised and settled.'
              : 'This option will expire worthless with no settlement value.'
            }
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleProcess}
            disabled={isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Settlement
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}