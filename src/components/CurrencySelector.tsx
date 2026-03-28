
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CurrencySelectorProps {
  currency: 'NGN' | 'USD';
  onCurrencyChange: (currency: 'NGN' | 'USD') => void;
}

const CurrencySelector = ({ currency, onCurrencyChange }: CurrencySelectorProps) => {
  return (
    <div>
      <Label className="text-lg font-medium">Currency</Label>
      <Select value={currency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NGN">₦ Nigerian Naira (NGN)</SelectItem>
          <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default CurrencySelector;
