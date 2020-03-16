import Card from "../component/Card";

class PlayGround extends Phaser.GameObjects.Group {
  controller;

  foundations = [];
  tableau = [];
  free = []
  holderMap = {};
  multipleCards = [];
  lastTimeClick = 0
  moveMultipleCards = false

  deck = [];
  deckMap = {};

  constructor(scene, controller) {
    super();
    window.deck = this.deckMap;
    this.controller = controller;

    for (let i = 0; i < 4; i++) {
      let holder = scene.add.sprite((400 + i * 185) - 310, 280, "holder");
      holder.setOrigin(0.5);
      // holder.setScale(0.8);
      holder.type = `free`;
      holder.no = i + 1;
      holder.alpha = .5
      this.holderMap[`free${i + 1}`] = holder;
      this.free.push(holder);
      this.add(holder);
    }

    for (let i = 0; i < 4; i++) {
      let holder = scene.add.sprite((400 + (i + 5) * 185) - 310, 280, "holder");
      holder.setOrigin(0.5);
      // holder.setScale(0.8);
      holder.type = `foundations`;
      holder.no = i + 1;
      holder.alpha = .5
      let icon_holder = scene.add.sprite(holder.x, holder.y, `holder_${i + 1}`);
      icon_holder.setOrigin(0.5);
      // icon_holder.setScale(0.8);
      icon_holder.alpha = 0;

      this.add(icon_holder);

      this.holderMap[`foundations${i + 1}`] = holder;
      this.foundations.push(holder);
      this.add(holder);
    }

    for (let i = 0; i < 8; i++) {
      let holder = scene.add.sprite((400 + i * 185) - 220, 550, "holder");
      holder.setOrigin(0.5);
      // holder.setScale(0.8);
      holder.type = `tableau`;
      holder.no = i + 1;
      holder.alpha = .5
      this.holderMap[`tableau${i + 1}`] = holder;
      this.tableau.push(holder);
      this.add(holder);
    }

    for (let i = 0; i < 52; i++) {
      let number = (i % 13) + 1;
      let colorNo = Math.floor(i / 13);
      let card = new Card(
        scene,
        this.tableau[0].x - i / 4,
        this.tableau[0].y - i / 3,
        number,
        colorNo
      );
      card.flip()
      this.deck.push(card);
      this.deckMap[card.id] = card;
      card.onDrag.add(this._cardDrag, this);
      card.onClick.add(this._cardClick, this);
    }

    this.controller.onChange.add(this._onChange, this);
    this.controller.prepare(this.deck);

    this.controller.checkPossibleMove()

    scene.input.on("dragstart", (pointer, card) => {
      let canBeDragged = this.controller.canDrag(card.id);
      if (canBeDragged) {
        this.multipleCards = this.controller.getTableauArray(card.id);

        card.dragStart();
        if (this.multipleCards.length > 1) this._moveMultipleCards();
      }
      // call the controller to tell the draggable elements
    });
    scene.input.on("drag", (pointer, card, x, y) => {
      card.drag(x, y);
      if (this.multipleCards.length > 1) this._moveMultipleCards();
      // drag single card or drag multiple cards
    });
    scene.input.on("dragend", (pointer, card) => {
      card.dragEnd(); // ignore childs to be checked about place
      // call drag end on all cards
      this.moveMultipleCards = false
      this.controller.checkPossibleMove()
    });
  }

  _moveMultipleCards() {
    this.moveMultipleCards = true;
    let firstCard = this.multipleCards[0];
    let offSet = 0;

    for (let card of this.multipleCards) {
      if (offSet >= 1) {
        this.deckMap[card.id].x = this.deckMap[firstCard.id].x;
        this.deckMap[card.id].y = this.deckMap[firstCard.id].y + offSet * 40;
      }
      offSet++;
    }

    this._sortDragingCards();
  }

  _sortDragingCards() {
    this.multipleCards.forEach((data, index) => {
      let card = this.deckMap[data.id];
      card.setOrder(index * 1500);
    });
  }

  _moveBackMultipleCards() {
    let firstCard = this.multipleCards[0];
    let offSet = 0;
    for (let card of this.multipleCards) {
      if (offSet >= 1) {
        this.deckMap[card.id].goTo(
          this.deckMap[firstCard.id].previous.x,
          this.deckMap[firstCard.id].previous.y + offSet * 40
        );
      }
      offSet++;
    }
  }

  _cardDrag(card) {
    let data = this._canPlace(card);
    // ignore asking the controller for placing child cards
    if (data) {
      let placed = this.controller.canPlace(card.id, data.type, data.number);
      if (placed) return;
    }
    card.goTo(card.previous.x, card.previous.y);
    if (this.multipleCards.length > 1) {
      this._moveBackMultipleCards();
    }
    // if card contains child cards
  }

  _cardClick(card) {
    let clickDelay = card.scene.time.now - this.lastTimeClick;
    this.lastTimeClick = card.scene.time.now
    if (clickDelay < 350) {
      this.controller.checkPossibleMove(card.id, true)
    } else {
      this.controller.checkPossibleMove()
    }
  }

  _canPlace(card) {

    // TODO: fix something here
    let fields = [...this.foundations, ...this.tableau, ...this.free];
    let holders = fields.filter(field => {
      let rect = field.getBounds();
      if (field.type == "tableau") {
        rect.height = 1000;
      }
      return rect.contains(card.x, card.y);
    });
    if (holders.length) {
      let holder = holders[0];
      return {
        type: holder.type,
        number: holder.no
      };
    } else {
      return null;
    }
  }

  _onChange(events) {
    // execute the events
    for (let event of events) {
      if (event.flip) {
        this._flipCard(event.card, event.flip);
      }
      if (event.move) {
        this._moveCard(event.card, event.move);
      }
    }
    this.controller._checkFinish();
  }

  _flipCard(card, {
    flipped
  }) {
    this.deckMap[card.id].flip(flipped);
  }

  _moveCard(card, {
    field,
    number,
    order
  }) {
    this._cardPlacing(this.deckMap[card.id], field, number, order);
  }

  _sort() {
    // sort after ending the tween
    // TODO: fix something here
    if (this.moveMultipleCards) return

    for (let id in this.controller.tableau) {
      let tableau = this.controller.tableau[id];

      tableau.forEach((data, index) => {
        let card = this.deckMap[data.id];
        card.setOrder(index);
      });
    }

    for (let id in this.controller.foundations) {
      let foundations = this.controller.foundations[id];
      foundations.forEach((data, index) => {
        let card = this.deckMap[data.id];
        card.setOrder(index);
      });
    }
  }

  _cardPlacing(card, field, number, order) {
    let holder = this.holderMap[field + number]
    card.goTo(holder.x, holder.y + order * 40)
  }
}

export default PlayGround;