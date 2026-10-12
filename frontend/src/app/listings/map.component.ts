import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  SimpleChanges,
  inject,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type * as Leaflet from 'leaflet';
import { Property } from '../core/models';
import { SelectionService } from '../core/selection.service';
@Component({
  selector: 'app-map',
  standalone: true,
  template:
    '<div class="map-area"><div #canvas class="map-canvas" role="region" aria-label="Map of search results"></div>@if(error) { <p class="map-warning" role="status">Map tiles are unavailable. All stays remain accessible in the results list.</p> }</div>',
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() properties: Property[] = [];
  @Input() selected = '';
  @Output() selectProperty = new EventEmitter<string>();
  @Output() openProperty = new EventEmitter<string>();
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLDivElement>;
  private map?: Leaflet.Map;
  private markers?: Leaflet.LayerGroup;
  private readonly markerById = new Map<string, Leaflet.Marker>();
  private leaflet?: typeof Leaflet;
  private destroyed = false;
  private readonly http = inject(HttpClient);
  private readonly selection = inject(SelectionService);
  error = false;
  async ngAfterViewInit() {
    try {
      const [leaflet, config] = await Promise.all([
        import('leaflet'),
        firstValueFrom(
          this.http.get<{ mapTileUrl: string; mapAttribution: string }>('/config.json'),
        ),
      ]);
      if (this.destroyed) return;
      this.leaflet = leaflet;
      this.map = leaflet
        .map(this.canvas.nativeElement, {
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        })
        .setView([36.885, 10.332], 13);
      leaflet
        .tileLayer(config.mapTileUrl, { attribution: config.mapAttribution, maxZoom: 19 })
        .on('tileerror', () => (this.error = true))
        .addTo(this.map);
      this.markers = leaflet.layerGroup().addTo(this.map);
      this.render();
      this.map.invalidateSize();
    } catch {
      this.error = true;
    }
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['properties']) this.render();
    else
      for (const p of this.properties) {
        this.markerById.get(p.id)?.setIcon(this.icon(p));
      }
  }
  private icon(p: Property): Leaflet.DivIcon {
    const price = p.nightlyPrice * this.selection.nights + p.cleaningFee + p.serviceFee;
    return this.leaflet!.divIcon({
      className: 'price-marker' + (p.id === this.selected ? ' selected' : ''),
      html: `${price.toFixed(3)} TND`,
      iconSize: [115, 32],
    });
  }
  private render() {
    const L = this.leaflet;
    if (!L || !this.map || !this.markers) return;
    this.markers.clearLayers();
    this.markerById.clear();
    for (const p of this.properties) {
      const marker = L.marker([p.latitude, p.longitude], {
        icon: this.icon(p),
        title: p.title,
        alt: `${p.title} — open details`,
      });
      const popup = document.createElement('div');
      popup.className = 'map-popup';
      const image = document.createElement('img');
      image.src = p.images[0];
      image.alt = p.title;
      const title = document.createElement('strong');
      title.textContent = p.title;
      const button = document.createElement('button');
      button.textContent = 'View details';
      button.onclick = () => this.openProperty.emit(p.id);
      popup.append(image, title, document.createElement('br'), button);
      marker
        .bindPopup(popup)
        .on('click', () => this.selectProperty.emit(p.id))
        .addTo(this.markers);
      this.markerById.set(p.id, marker);
    }
    if (this.properties.length)
      this.map.fitBounds(
        L.latLngBounds(this.properties.map((p) => [p.latitude, p.longitude] as [number, number])),
        { padding: [50, 50], maxZoom: 14, animate: false },
      );
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.map?.remove();
  }
}
