import { PhoneCall, ShieldAlert, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const FAQ_ITEMS = [
  {
    q: "How does ResQAI coordinate autonomous responder dispatch?",
    a: "ResQAI leverages real-time routing heuristics matching incident parameters (e.g., fire intensity, Musi River water levels) with available NDRF, SDRF, and civil defense fleets, generating optimal routing models automatically."
  },
  {
    q: "Is this tactical command dashboard accessible to the public?",
    a: "No. The tactical command dashboard, logistical resource levels, and fleet vectors are strictly restricted to Disaster Management Department officials. The public can only access the landing console and submit verified distress signals via the Citizen SOS module."
  },
  {
    q: "How does the AI vision scan verify citizen distress reports?",
    a: "When a photo is attached to an SOS ticket, our embedded Gemini vision intelligence scans the image metadata and visual features to confirm active crises, filtering out false alarms automatically before they reach EOC dispatchers."
  },
  {
    q: "How are Musi River flood projections calculated?",
    a: "Our threat engines simulate volumetric flooding ranges dynamically by parsing real-time rainfall telemetry, upstream dam gate releases, and topographical elevation models across the Hyderabad basin."
  },
  {
    q: "What should I do if the EOC secure gate goes offline?",
    a: "In the rare event of a secure gate disconnection, officials should immediately fall back to the state's hardwired radio loops or police/fire hotlines. Local system logs remain buffered on-site."
  },
  {
    q: "Can I adjust my EOC operational profile and role?",
    a: "Yes, authorized personnel can select the profile cog located in the sidebar footer to switch roles dynamically (e.g., between Incident Operator, Emergency Coordinator, and Administrator) to modify console permissions."
  },
  {
    q: "What is the console's auto-logout security policy?",
    a: "To prevent unauthorized physical access at active command desks, sessions automatically terminate and redirect to the secure EOC gateway after 10 minutes of complete inactivity."
  },
  {
    q: "How does the route optimizer handle road blockages?",
    a: "The optimizer parses live traffic signals and operator-reported blockages to instantly reroute responders, plotting safe passage corridors around flash hazards and structural collapes."
  }
];

function FAQ() {
  return (
    <div className="w-full min-h-screen py-24 border-t border-white/5 bg-zinc-950/20 relative overflow-hidden flex items-center">
      {/* Background Wallpaper Image */}
      <div className="custom-landing-bg" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="flex gap-8 flex-col sticky top-24">
            <div className="flex gap-4 flex-col">
              <div>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-950/20 uppercase tracking-widest font-mono text-[9px] px-3 py-1">
                  System Operations FAQ
                </Badge>
              </div>
              <div className="flex gap-3 flex-col">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight hero-gradient-text leading-tight text-left">
                  TSDMA ResQAI Intelligence Hub
                </h2>
                <p className="text-base text-zinc-300 max-w-lg leading-relaxed font-sans text-left">
                  Review tactical guides, telemetry details, and operational protocols for the Telangana State Emergency Operations Center automated dispatch platforms.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  onClick={() => window.open('tel:1070')}
                  className="gap-2 font-mono text-sm uppercase tracking-wider h-12 px-5 cursor-pointer" 
                  variant="default"
                >
                  <PhoneCall className="w-4 h-4" /> State EOC Helpline (1070)
                </Button>
                <Button 
                  onClick={() => window.open('tel:100')}
                  className="gap-2 font-mono text-sm uppercase tracking-wider h-12 px-5 cursor-pointer" 
                  variant="outline"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" /> Police Desk (100)
                </Button>
              </div>
            </div>

            <div className="bg-red-950/15 border border-red-950/30 p-4 rounded-xl flex items-start gap-3 max-w-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="font-mono text-xs leading-relaxed text-zinc-300">
                <span className="text-red-400 font-bold block mb-1">CLASSIFIED INFORMATION NOTICE</span>
                All telemetry data, fleet assignments, and incident analysis logs within this system are for official EOC usage only. Public dissemination is strictly prohibited.
              </div>
            </div>
          </div>
          
          <Accordion type="single" collapsible className="w-full font-sans text-sm border border-white/5 rounded-2xl bg-zinc-900/10 p-6 divide-y divide-white/5">
            {FAQ_ITEMS.map((faq, index) => (
              <AccordionItem key={index} value={"item-" + index} className="border-b-0 py-2 first:pt-0 last:pb-0">
                <AccordionTrigger className="font-bold hover:no-underline text-zinc-200 hover:text-cyan-400 py-4 text-sm tracking-wide text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400 leading-relaxed text-sm pt-2 pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

export { FAQ };
