"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  Info,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Search,
  Share2,
  Shield,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const BUTTON_VARIANTS = [
  ["default", "Guardar"],
  ["secondary", "Secundario"],
  ["outline", "Contorno"],
  ["ghost", "Fantasma"],
  ["destructive", "Eliminar"],
  ["link", "Ver todo"],
] as const

const TEXT_SIZES = ["xs", "sm", "default", "lg", "xl"] as const

const ICON_SIZES = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const

const BADGE_VARIANTS = ["default", "secondary", "outline", "destructive"] as const

const BADGE_TONES = [
  ["neutral", "Neutro"],
  ["primary", "Actual"],
  ["success", "Vigente"],
  ["destructive", "Revocada"],
  ["warning", "Agotada"],
  ["gold", "MVP"],
] as const

function Demo({
  title,
  hint,
  className,
  children,
}: {
  title: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("panel min-w-0 space-y-3 rounded-xl p-4", className)}>
      <div className="space-y-0.5">
        <h3 className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {title}
        </h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

export function PrimitivesSection() {
  const [rating, setRating] = React.useState([6.5])
  const [range, setRange] = React.useState([20, 80])
  const [view, setView] = React.useState("cards")
  const [showInactive, setShowInactive] = React.useState(false)

  return (
    <section aria-labelledby="ui-kit-primitives" className="space-y-3">
      <div className="space-y-1">
        <h2
          id="ui-kit-primitives"
          className="font-display text-display-md font-extrabold tracking-wide uppercase"
        >
          Primitivas
        </h2>
        <p className="text-sm text-muted-foreground">
          Componentes base de src/components/ui. Probá con emulación táctil
          (pointer: coarse) y a 375px.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Button · variantes" className="lg:col-span-2">
          <Row>
            {BUTTON_VARIANTS.map(([variant, label]) => (
              <Button key={variant} variant={variant}>
                {label}
              </Button>
            ))}
            <Button variant="whatsapp">
              <MessageCircle data-icon="inline-start" />
              Compartir por WhatsApp
            </Button>
          </Row>
          <Row>
            <Button>
              <Plus data-icon="inline-start" />
              Agregar jugador
            </Button>
            <Button variant="outline">
              Ordenar
              <ChevronDown data-icon="inline-end" />
            </Button>
            <Button disabled>Deshabilitado</Button>
            <Button variant="secondary" disabled>
              Deshabilitado
            </Button>
          </Row>
        </Demo>

        <Demo
          title="Button · tamaños"
          hint="Con pointer: coarse, default e icon llegan a 44px."
          className="lg:col-span-2"
        >
          <Row>
            {TEXT_SIZES.map((size) => (
              <Button key={size} size={size}>
                {size}
              </Button>
            ))}
          </Row>
          <Row>
            {ICON_SIZES.map((size) => (
              <Button
                key={size}
                size={size}
                variant="secondary"
                aria-label={`Editar (${size})`}
              >
                <Pencil />
              </Button>
            ))}
            <Button size="icon" variant="ghost" aria-label="Más acciones">
              <MoreHorizontal />
            </Button>
          </Row>
          <Button size="lg" className="w-full">
            Guardar cambios
          </Button>
        </Demo>

        <Demo title="Badge · variantes y tonos">
          <Row>
            {BADGE_VARIANTS.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </Row>
          <Row>
            {BADGE_TONES.map(([tone, label]) => (
              <Badge key={tone} tone={tone}>
                {label}
              </Badge>
            ))}
          </Row>
          <Row>
            {BADGE_TONES.map(([tone, label]) => (
              <Badge key={tone} tone={tone} size="sm">
                {label}
              </Badge>
            ))}
            <Badge tone="neutral" size="sm">
              <Shield data-icon="inline-start" className="text-primary" />
              Admin
            </Badge>
          </Row>
        </Demo>

        <Demo title="Avatar · Progress · Separator">
          <Row>
            <Avatar size="sm">
              <AvatarFallback>LM</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>JR</AvatarFallback>
              <AvatarBadge />
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>DM</AvatarFallback>
              <AvatarBadge />
            </Avatar>
          </Row>
          <Separator />
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Plantel completo</span>
              <span className="tabular">64%</span>
            </div>
            <Progress value={64} aria-label="Plantel completo" />
          </div>
        </Demo>

        <Demo title="Input · Textarea" hint="Normal, inválido y solo lectura.">
          <div className="space-y-2">
            <Label htmlFor="kit-nickname">Apodo</Label>
            <Input
              id="kit-nickname"
              placeholder="Ej.: el Pulga"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="next"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-invalid">Email</Label>
            <Input
              id="kit-invalid"
              type="email"
              defaultValue="pulga@"
              aria-invalid
              aria-describedby="kit-invalid-error"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p id="kit-invalid-error" className="text-xs text-destructive">
              Revisá el email.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-readonly">Link de invitación</Label>
            <Input
              id="kit-readonly"
              readOnly
              defaultValue="fulbot.app/i/abc123"
            />
          </div>
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Buscar jugador"
              aria-label="Buscar jugador"
              enterKeyHint="search"
            />
          </InputGroup>
          <Textarea placeholder="Notas del partido" aria-label="Notas" />
          <Textarea
            aria-label="Notas inválidas"
            aria-invalid
            defaultValue="Demasiado corto"
          />
          <Textarea
            aria-label="Notas de solo lectura"
            readOnly
            defaultValue="Cargado por el admin."
          />
        </Demo>

        <Demo title="Switch · Radio · Select · Toggle">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="kit-inactive">Mostrar inactivos</Label>
            <Switch
              id="kit-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
          </div>
          <Separator />
          <RadioGroup defaultValue="right" aria-label="Pierna hábil">
            {[
              ["right", "Derecha"],
              ["left", "Izquierda"],
              ["both", "Ambas"],
            ].map(([value, label]) => (
              <div key={value} className="flex items-center gap-3">
                <RadioGroupItem value={value} id={`kit-foot-${value}`} />
                <Label htmlFor={`kit-foot-${value}`}>{label}</Label>
              </div>
            ))}
          </RadioGroup>
          <Separator />
          <Select defaultValue="rating">
            <SelectTrigger aria-label="Ordenar por" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="rating">Valoración</SelectItem>
              <SelectItem value="matches">Partidos</SelectItem>
              <SelectItem value="goals">Goles</SelectItem>
              <SelectItem value="name">A–Z</SelectItem>
            </SelectContent>
          </Select>
          <Row>
            <ToggleGroup
              type="single"
              variant="outline"
              value={view}
              onValueChange={(next) => next && setView(next)}
              aria-label="Vista"
            >
              <ToggleGroupItem value="cards" aria-label="Ver como cartas">
                <LayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Ver como lista">
                <Rows3 />
              </ToggleGroupItem>
            </ToggleGroup>
            <Toggle aria-label="Favorito" variant="outline">
              <Star />
              Favorito
            </Toggle>
          </Row>
        </Demo>

        <Demo title="Tabs (line)">
          <Tabs defaultValue="summary">
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="summary">Resumen</TabsTrigger>
              <TabsTrigger value="matches">Partidos</TabsTrigger>
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="pt-2 text-muted-foreground">
              12 partidos, 5 goles y 3 asistencias.
            </TabsContent>
            <TabsContent value="matches" className="pt-2 text-muted-foreground">
              Muy pronto.
            </TabsContent>
            <TabsContent value="stats" className="pt-2 text-muted-foreground">
              Muy pronto.
            </TabsContent>
          </Tabs>
        </Demo>

        <Demo title="Slider" hint="Raíz de 44px: toda la franja responde al toque.">
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Nivel inicial</span>
              <span className="font-display text-stat font-extrabold tabular">
                {rating[0]}
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={0.5}
              value={rating}
              onValueChange={setRating}
              rangeClassName="bg-gradient-to-r from-[oklch(0.6_0.1_55)] via-[oklch(0.84_0.13_88)] to-[oklch(0.66_0.19_256)]"
              thumbProps={{
                "aria-label": "Nivel inicial",
                "aria-valuetext": `${rating[0]} de 10`,
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Rango de edad</span>
              <span className="tabular">
                {range[0]}–{range[1]}
              </span>
            </div>
            <Slider value={range} onValueChange={setRange} />
          </div>
          <Slider defaultValue={[40]} disabled thumbProps={{ "aria-label": "Deshabilitado" }} />
        </Demo>

        <Demo title="Card · Skeleton">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Próximo partido</CardTitle>
              <CardDescription>Jueves 21 h · Cancha 3</CardDescription>
              <CardAction>
                <Badge tone="primary" size="sm">
                  F5
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Faltan 3 confirmaciones para armar los equipos.
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost" size="sm">
                Más tarde
              </Button>
              <Button size="sm">Confirmar</Button>
            </CardFooter>
          </Card>
          <div className="flex items-center gap-3" aria-hidden>
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-7 w-10 rounded-lg" />
          </div>
        </Demo>

        <Demo
          title="Overlays"
          hint="A 375px, Dialog y AlertDialog se anclan abajo con botones de 48px; desde 640px se centran."
          className="lg:col-span-2"
        >
          <Row>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Acciones
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Jugador</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Pencil />
                  Editar ficha
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 />
                  Compartir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                >
                  Mostrar inactivos
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2 />
                  Eliminar ficha
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Diálogo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar apodo</DialogTitle>
                  <DialogDescription>
                    Así te ven en el plantel y en los rankings.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  aria-label="Apodo"
                  defaultValue="Pulga"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button>Guardar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">AlertDialog</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar ficha?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borra del plantel. Si ya jugó partidos, mejor desactivala
                    para conservar su historial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">AlertDialog sm</Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <Shield className="text-primary" />
                  </AlertDialogMedia>
                  <AlertDialogTitle>¿Hacerlo admin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Va a poder editar fichas e invitar gente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">
                  <SlidersHorizontal data-icon="inline-start" />
                  Hoja inferior
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Elegí cómo ver el plantel.</SheetDescription>
                </SheetHeader>
                <div className="flex items-center justify-between gap-3 px-4">
                  <Label htmlFor="kit-sheet-inactive">Mostrar inactivos</Label>
                  <Switch
                    id="kit-sheet-inactive"
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                  />
                </div>
                <SheetFooter>
                  <Button size="lg" className="w-full">
                    Aplicar
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost">Popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <PopoverHeader>
                  <PopoverTitle>Valoración provisional</PopoverTitle>
                  <PopoverDescription>
                    Se ajusta sola después de 3 partidos.
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Cómo se calcula">
                  <Info />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Se calcula con los últimos 10 partidos.</TooltipContent>
            </Tooltip>
          </Row>
        </Demo>
      </div>
    </section>
  )
}
