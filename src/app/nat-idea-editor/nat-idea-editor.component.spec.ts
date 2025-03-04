import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NatIdeaEditorComponent } from './nat-idea-editor.component';

describe('NatIdeaEditorComponent', () => {
  let component: NatIdeaEditorComponent;
  let fixture: ComponentFixture<NatIdeaEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NatIdeaEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NatIdeaEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
