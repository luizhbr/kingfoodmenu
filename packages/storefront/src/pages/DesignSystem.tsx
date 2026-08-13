import React from 'react';
import {
  Button,
  Input,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Skeleton,
  Modal,
  Drawer,
  BottomSheet,
  Alert,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionHeader,
  Tabs,
  Price,
  QuantitySelector,
  Toast,
  IconButton,
  Switch,
  ProductCard,
  CartItem,
  CheckoutSection,
  OrderStatus,
  PrintStatus,
  DriverStatus,
} from '@kitchenasty/shared-ui';

export default function DesignSystem() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [tab, setTab] = React.useState('colors');
  const [qty, setQty] = React.useState(2);

  return (
    <div className="min-h-screen bg-kf-bg p-4 pb-24">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="King Food Design System V2"
          subtitle="Catálogo visual de tokens e componentes"
        />

        <Tabs
          tabs={[
            { id: 'colors', label: 'Cores' },
            { id: 'typography', label: 'Tipografia' },
            { id: 'components', label: 'Componentes' },
            { id: 'cards', label: 'Cards' },
            { id: 'status', label: 'Status' },
          ]}
          active={tab}
          onChange={setTab}
        />

        <div className="mt-6 space-y-6">
          {tab === 'colors' && (
            <>
              <SectionHeader title="Paleta King Food" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {[
                  ['bg', 'Background'],
                  ['surface', 'Surface'],
                  ['surface-muted', 'Surface Muted'],
                  ['foreground', 'Foreground'],
                  ['muted', 'Muted'],
                  ['border', 'Border'],
                  ['primary', 'Primary'],
                  ['primary-hover', 'Primary Hover'],
                  ['primary-fg', 'Primary Foreground'],
                  ['secondary', 'Secondary'],
                  ['accent', 'Accent'],
                  ['success', 'Success'],
                  ['warning', 'Warning'],
                  ['danger', 'Danger'],
                  ['info', 'Info'],
                  ['cream', 'Cream'],
                  ['ink', 'Ink'],
                ].map(([token, label]) => (
                  <div key={token} className="rounded-kf-lg border border-kf-border bg-kf-surface p-3">
                    <div className={`mb-2 h-10 w-full rounded-kf-md bg-kf-${token}`} />
                    <p className="text-xs font-semibold text-kf-foreground">{label}</p>
                    <p className="text-[10px] text-kf-muted">{`bg-kf-${token}`}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'typography' && (
            <>
              <SectionHeader title="Escala Tipográfica" />
              <Card>
                <CardBody className="space-y-3">
                  <p className="text-xs text-kf-muted">text-xs — Legenda pequena</p>
                  <p className="text-sm text-kf-foreground">text-sm — Corpo secundário</p>
                  <p className="text-base text-kf-foreground">text-base — Corpo principal</p>
                  <p className="text-lg font-semibold text-kf-foreground">text-lg — Destaque</p>
                  <p className="text-xl font-bold text-kf-foreground">text-xl — Título pequeno</p>
                  <p className="text-2xl font-bold text-kf-foreground">text-2xl — Título médio</p>
                </CardBody>
              </Card>
            </>
          )}

          {tab === 'components' && (
            <>
              <SectionHeader title="Botões" />
              <div className="flex flex-wrap gap-2">
                <Button>Primário</Button>
                <Button variant="secondary">Secundário</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Perigo</Button>
                <Button size="sm">Pequeno</Button>
                <Button size="lg">Grande</Button>
                <Button disabled>Desabilitado</Button>
              </div>

              <SectionHeader title="Inputs" />
              <div className="space-y-3">
                <Input label="Nome" placeholder="Digite seu nome" />
                <Input label="Email" placeholder="email@exemplo.com" error="Email inválido" />
                <Input label="Telefone" placeholder="(614) 555-1234" hint="Opcional" />
              </div>

              <SectionHeader title="Badges, Spinners, Skeletons" />
              <div className="flex flex-wrap items-center gap-3">
                <Badge>Padrão</Badge>
                <Badge variant="success">Sucesso</Badge>
                <Badge variant="warning">Aviso</Badge>
                <Badge variant="danger">Perigo</Badge>
                <Spinner />
                <Spinner size="lg" />
                <Skeleton className="h-10 w-32" />
              </div>

              <SectionHeader title="Overlays" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setModalOpen(true)}>Abrir Modal</Button>
                <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Abrir Drawer</Button>
                <Button variant="outline" onClick={() => setSheetOpen(true)}>Abrir Bottom Sheet</Button>
              </div>

              <SectionHeader title="Alertas e Estados" />
              <div className="space-y-2">
                <Alert title="Atenção" variant="warning">Estoque baixo no item.</Alert>
                <Alert title="Sucesso" variant="success">Pedido confirmado.</Alert>
                <EmptyState icon="🛒" title="Carrinho vazio" description="Adicione itens para começar." />
                <ErrorState description="Tente novamente mais tarde." retry={() => {}} />
              </div>

              <SectionHeader title="Toast e Switch" />
              <div className="flex flex-wrap gap-3">
                <Toast title="Comanda preparada" description="WhatsApp aberto" variant="success" />
                <Switch label="Ativar notificações" />
              </div>

              <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Modal de exemplo"
                description="Este é um modal do King Food Design System."
                footer={
                  <>
                    <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button onClick={() => setModalOpen(false)}>Confirmar</Button>
                  </>
                }
              >
                <p className="text-sm text-kf-muted">Conteúdo do modal.</p>
              </Modal>

              <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title="Drawer lateral"
                position="right"
              >
                <p className="text-sm text-kf-muted">Conteúdo do drawer.</p>
              </Drawer>

              <BottomSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                title="Bottom Sheet"
              >
                <p className="text-sm text-kf-muted">Conteúdo do bottom sheet.</p>
              </BottomSheet>
            </>
          )}

          {tab === 'cards' && (
            <>
              <SectionHeader title="Cards de Produto e Carrinho" />
              <div className="grid gap-4 sm:grid-cols-2">
                <ProductCard
                  id="1"
                  name="Smash Burger Duplo"
                  description="Dois smash burgers com queijo cheddar e pão brioche."
                  price={13.90}
                  badge="Mais pedido"
                  onAdd={() => {}}
                />
                <ProductCard
                  id="2"
                  name="Açaí 500ml"
                  description="Açaí com granola e banana."
                  price={9.90}
                  image="https://images.unsplash.com/photo-1543573852-1a71a6ce19bc?w=400"
                  onAdd={() => {}}
                />
              </div>

              <SectionHeader title="Item de Carrinho" />
              <CartItem
                id="1"
                name="Smash Burger Duplo"
                quantity={qty}
                unitPrice={13.90}
                options={['Bacon', 'Cebola caramelizada']}
                onQuantityChange={setQty}
                onRemove={() => {}}
              />

              <SectionHeader title="Seção de Checkout" />
              <CheckoutSection title="Seus dados" step={1}>
                <Input label="Nome" placeholder="Seu nome" />
              </CheckoutSection>
            </>
          )}

          {tab === 'status' && (
            <>
              <SectionHeader title="Status de Pedido" />
              <div className="flex flex-wrap gap-2">
                <OrderStatus status="PENDING" />
                <OrderStatus status="CONFIRMED" />
                <OrderStatus status="PREPARING" />
                <OrderStatus status="READY" />
                <OrderStatus status="OUT_FOR_DELIVERY" />
                <OrderStatus status="DELIVERED" />
                <OrderStatus status="CANCELLED" />
              </div>

              <SectionHeader title="Status de Impressão" />
              <div className="flex flex-wrap gap-2">
                <PrintStatus status="idle" />
                <PrintStatus status="sending" />
                <PrintStatus status="printed" />
                <PrintStatus status="failed" />
              </div>

              <SectionHeader title="Status de Entregador" />
              <div className="flex flex-wrap gap-2">
                <DriverStatus status="AVAILABLE" />
                <DriverStatus status="ASSIGNED" />
                <DriverStatus status="PICKING_UP" />
                <DriverStatus status="OUT_FOR_DELIVERY" />
                <DriverStatus status="DELIVERED" />
              </div>

              <SectionHeader title="Preço" />
              <div className="flex flex-wrap items-baseline gap-4">
                <Price value={13.90} />
                <Price value={27.80} original={35.00} />
                <Price value={42.80} size="lg" />
              </div>

              <SectionHeader title="Seletor de Quantidade" />
              <QuantitySelector value={qty} onChange={setQty} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
