import { createHostComponent } from './runtime'
import type {
  AlertDescriptionProps,
  AlertProps,
  AlertTitleProps,
  BadgeProps,
  ButtonProps,
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
  InputProps,
  ResponsiveTabsProps,
  SeparatorProps,
  SkeletonProps,
  TableBodyProps,
  TableCaptionProps,
  TableCellProps,
  TableFooterProps,
  TableHeadProps,
  TableHeaderProps,
  TableProps,
  TableRowProps,
  TextareaProps,
} from './types'

export const ResponsiveTabs = createHostComponent<ResponsiveTabsProps>(
  (runtime) => runtime.ui.ResponsiveTabs
)

export const Badge = createHostComponent<BadgeProps>(
  (runtime) => runtime.ui.Badge
)

export const Button = createHostComponent<ButtonProps>(
  (runtime) => runtime.ui.Button
)

export const Input = createHostComponent<InputProps>(
  (runtime) => runtime.ui.Input
)

export const Textarea = createHostComponent<TextareaProps>(
  (runtime) => runtime.ui.Textarea
)

export const Table = createHostComponent<TableProps>(
  (runtime) => runtime.ui.Table
)

export const TableHeader = createHostComponent<TableHeaderProps>(
  (runtime) => runtime.ui.TableHeader
)

export const TableBody = createHostComponent<TableBodyProps>(
  (runtime) => runtime.ui.TableBody
)

export const TableFooter = createHostComponent<TableFooterProps>(
  (runtime) => runtime.ui.TableFooter
)

export const TableRow = createHostComponent<TableRowProps>(
  (runtime) => runtime.ui.TableRow
)

export const TableHead = createHostComponent<TableHeadProps>(
  (runtime) => runtime.ui.TableHead
)

export const TableCell = createHostComponent<TableCellProps>(
  (runtime) => runtime.ui.TableCell
)

export const TableCaption = createHostComponent<TableCaptionProps>(
  (runtime) => runtime.ui.TableCaption
)

export const Card = createHostComponent<CardProps>(
  (runtime) => runtime.ui.Card
)

export const CardHeader = createHostComponent<CardHeaderProps>(
  (runtime) => runtime.ui.CardHeader
)

export const CardTitle = createHostComponent<CardTitleProps>(
  (runtime) => runtime.ui.CardTitle
)

export const CardDescription = createHostComponent<CardDescriptionProps>(
  (runtime) => runtime.ui.CardDescription
)

export const CardContent = createHostComponent<CardContentProps>(
  (runtime) => runtime.ui.CardContent
)

export const CardFooter = createHostComponent<CardFooterProps>(
  (runtime) => runtime.ui.CardFooter
)

export const Alert = createHostComponent<AlertProps>(
  (runtime) => runtime.ui.Alert
)

export const AlertTitle = createHostComponent<AlertTitleProps>(
  (runtime) => runtime.ui.AlertTitle
)

export const AlertDescription = createHostComponent<AlertDescriptionProps>(
  (runtime) => runtime.ui.AlertDescription
)

export const Skeleton = createHostComponent<SkeletonProps>(
  (runtime) => runtime.ui.Skeleton
)

export const Separator = createHostComponent<SeparatorProps>(
  (runtime) => runtime.ui.Separator
)

export type {
  AlertDescriptionProps,
  AlertProps,
  AlertTitleProps,
  BadgeProps,
  ButtonProps,
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
  InputProps,
  ResponsiveTabItem,
  ResponsiveTabsProps,
  SeparatorProps,
  SkeletonProps,
  TableBodyProps,
  TableCaptionProps,
  TableCellProps,
  TableFooterProps,
  TableHeadProps,
  TableHeaderProps,
  TableProps,
  TableRowProps,
  TextareaProps,
} from './types'
