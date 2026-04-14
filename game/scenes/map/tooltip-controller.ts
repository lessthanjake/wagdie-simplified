import * as Phaser from 'phaser';

export class TooltipController {
  private readonly tooltip: Phaser.GameObjects.Container;
  private readonly tooltipText: Phaser.GameObjects.Text;
  private readonly tooltipBg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.tooltipBg = scene.add.rectangle(0, 0, 200, 40, 0x0f0f0f, 0.95);
    this.tooltipBg.setStrokeStyle(2, 0xd4af37);
    this.tooltipBg.setOrigin(0.5, 1);

    this.tooltipText = scene.add.text(0, -20, '', {
      fontFamily: 'serif',
      fontSize: '14px',
      color: '#e8e8e8',
      align: 'center',
    });
    this.tooltipText.setOrigin(0.5, 0.5);

    this.tooltip = scene.add.container(0, 0, [this.tooltipBg, this.tooltipText]);
    this.tooltip.setDepth(1000);
    this.tooltip.setVisible(false);
    this.tooltip.setScrollFactor(0);
  }

  show(text: string, screenX: number, screenY: number): void {
    this.tooltipText.setText(text);
    this.tooltipBg.setSize(this.tooltipText.width + 24, 36);
    this.updatePosition(screenX, screenY);
    this.tooltip.setVisible(true);
  }

  hide(): void {
    this.tooltip.setVisible(false);
  }

  updatePosition(screenX: number, screenY: number): void {
    this.tooltip.setPosition(screenX, screenY - 20);
  }

  isVisible(): boolean {
    return this.tooltip.visible;
  }

  destroy(): void {
    this.tooltip.destroy();
  }
}
