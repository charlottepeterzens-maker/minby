import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface Props {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropped: (blob: Blob) => void;
}

const CANVAS_SIZE = 280;
const OUTPUT_SIZE = 512;

const AvatarCropDialog = ({ file, open, onOpenChange, onCropped }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load image when file changes
  useEffect(() => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Fit image to canvas
      const minDim = Math.min(img.width, img.height);
      const fitScale = CANVAS_SIZE / minDim;
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
      setImgLoaded(true);
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]);

  // Draw preview
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = "#EDE8F4";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw image centered with offset, scale, rotation
    ctx.translate(CANVAS_SIZE / 2 + offset.x, CANVAS_SIZE / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.restore();
  }, [scale, offset, rotation, imgLoaded]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = () => setDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.2, Math.min(5, s - e.deltaY * 0.001)));
  };

  const handleCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const outCanvas = document.createElement("canvas");
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) return;

    // Scale factor from preview to output
    const ratio = OUTPUT_SIZE / CANVAS_SIZE;

    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * ratio, scale * ratio);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    outCanvas.toBlob(
      (blob) => {
        if (blob) {
          onCropped(blob);
          onOpenChange(false);
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[340px] p-0 gap-0 border-0 overflow-hidden"
        style={{ backgroundColor: "#F7F3EF", borderRadius: 20 }}
      >
        <div className="p-5 space-y-4">
          <p className="text-[14px] font-medium text-center" style={{ color: "#2A1A3C" }}>
            Justera din bild
          </p>

          {/* Canvas */}
          <div className="flex justify-center">
            <div
              className="relative rounded-full overflow-hidden"
              style={{
                width: CANVAS_SIZE,
                height: CANVAS_SIZE,
                boxShadow: "0 0 0 2px #EDE8F4",
                cursor: dragging ? "grabbing" : "grab",
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onWheel={handleWheel}
                style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, touchAction: "none" }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setScale((s) => Math.max(0.2, s - 0.15))}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#EDE8F4" }}
            >
              <ZoomOut className="w-4 h-4" style={{ color: "#3C2A4D" }} />
            </button>

            <input
              type="range"
              min={0.2}
              max={5}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-32 accent-[#3C2A4D]"
            />

            <button
              onClick={() => setScale((s) => Math.min(5, s + 0.15))}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#EDE8F4" }}
            >
              <ZoomIn className="w-4 h-4" style={{ color: "#3C2A4D" }} />
            </button>

            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#EDE8F4" }}
            >
              <RotateCw className="w-4 h-4" style={{ color: "#3C2A4D" }} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2.5 rounded-full text-[13px] font-medium"
              style={{ color: "#7A6A85", backgroundColor: "#EDE8F4" }}
            >
              Avbryt
            </button>
            <button
              onClick={handleCrop}
              className="flex-1 py-2.5 rounded-full text-[13px] font-medium"
              style={{ color: "#F7F3EF", backgroundColor: "#3C2A4D" }}
            >
              Spara
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCropDialog;
