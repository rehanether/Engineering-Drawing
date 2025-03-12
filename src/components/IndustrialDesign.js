import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";

export default function EvaporatorConfigurator() {
  const [capacity, setCapacity] = useState("1T");
  const [industry, setIndustry] = useState("");
  const [feedData, setFeedData] = useState({ density: "", tds: "", pH: "" });

  const handleSubmit = async () => {
    const response = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacity, industry, ...feedData }),
    });
    const data = await response.json();
    console.log("Calculation Result:", data);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold">AI-Based Evaporator Configurator</h2>
          
          <Select value={capacity} onChange={setCapacity}>
            <SelectItem value="1T">1 Ton</SelectItem>
            <SelectItem value="2T">2 Ton</SelectItem>
            <SelectItem value="3T">3 Ton</SelectItem>
            <SelectItem value="5T">5 Ton</SelectItem>
          </Select>
          
          <Select value={industry} onChange={setIndustry}>
            <SelectItem value="pharma">Pharma</SelectItem>
            <SelectItem value="sugar">Sugar</SelectItem>
            <SelectItem value="petroleum">Petroleum</SelectItem>
            <SelectItem value="beverage">Beverage</SelectItem>
            <SelectItem value="dairy">Dairy</SelectItem>
            <SelectItem value="wastewater">Wastewater</SelectItem>
          </Select>

          <Input placeholder="Density (kg/m³)" value={feedData.density} onChange={(e) => setFeedData({ ...feedData, density: e.target.value })} />
          <Input placeholder="TDS (ppm)" value={feedData.tds} onChange={(e) => setFeedData({ ...feedData, tds: e.target.value })} />
          <Input placeholder="pH" value={feedData.pH} onChange={(e) => setFeedData({ ...feedData, pH: e.target.value })} />

          <Button onClick={handleSubmit}>Calculate</Button>
        </CardContent>
      </Card>
    </div>
  );
}

