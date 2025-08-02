import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { AlertTriangle } from "lucide-react";
import { supportedChains } from "@/lib/thirdweb";
import { useSwitchActiveWalletChain } from "thirdweb/react";


export function UnavailableChain() {
    const switchChain = useSwitchActiveWalletChain()
    return (
        <div className="flex flex-col items-center justify-center h-full">
        <Alert className="max-w-md mx-auto border-red-500/20 bg-red-500/5">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription>
          Contract not available on this chain.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col items-center justify-center h-full">
        <Button variant="outline" className="mt-4 bg-green-500/20 text-green-500 hover:bg-green-500/30 hover:text-green-500"
        onClick={() => switchChain(supportedChains[1])}
        >
          Switch to Etherlink Testnet
        </Button>
      </div>
      </div>
    )
}