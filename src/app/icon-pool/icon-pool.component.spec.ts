import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconPoolComponent } from './icon-pool.component';

describe('IconPoolComponent', () => {
  let component: IconPoolComponent;
  let fixture: ComponentFixture<IconPoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconPoolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IconPoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
