import UploadBox from "@/components/UploadBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto mt-20 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold">Upload Specification</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadBox />
        </CardContent>
      </Card>
    </div>
  );
}
