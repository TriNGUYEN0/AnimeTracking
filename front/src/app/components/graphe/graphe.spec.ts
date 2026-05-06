import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Graphe } from './graphe';

describe('Graphe', () => {
  let component: Graphe;
  let fixture: ComponentFixture<Graphe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Graphe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Graphe);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
