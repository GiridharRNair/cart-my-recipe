import { Button } from "@/components/ui/button";

export default function App() {
    return (
        <div className="w-full h-full flex items-center justify-center space-y-4 space-x-4">
            <Button variant="default">Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
        </div>
    );
}
